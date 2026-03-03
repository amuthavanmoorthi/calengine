# BERSn Acceptance Checklist (Frozen v1.0)

Use this checklist for release sign-off of backend formulas.

## Environment
- [x] Run docker from `/infra/docker`
- [x] `calc` and `api` rebuilt after latest changes:
  - `docker compose up -d --build calc api`
- [x] Run full smoke command:
  - `npm run smoke:full`
- [x] Confirm generated evidence file exists:
  - `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`
- [x] Health checks pass:
  - `GET /health` on API
  - `GET /docs` or `GET /openapi.json` on calc

## Core Functional Checks

### 3-1 Classification
- [x] `POST /api/bersn/classification/normalize` returns:
  - [x] threshold logic (`5%/1000m²`) result per segment
  - [x] weighted segment outputs
  - [x] Table A + Table 3.2 lookup values

### 3-2-1 Excluded Zones + Eq.3.1 AFe
- [x] `POST /calc/bersn/formulas/afe` with `excluded_zones`:
  - [x] `AFk_total_m2` computed
  - [x] `excluded_zone_evaluation` includes per-zone reason
  - [x] `AFe = AF - ΣAfk`

### 3-2-2 Efficiency Preprocess
- [x] `POST /calc/bersn/formulas/preprocess-efficiency`:
  - [x] accepts direct EEV/EAC/EL
  - [x] computes EAC/EL from Appendix 2 inputs when direct values omitted
  - [x] tracks `preprocess_sources`

### 3-3-1 General Branch
- [x] `POST /calc/bersn/formulas/general-full` returns:
  - [x] `AFe`, `EtEUI`, weights `a,b,c`
  - [x] `EEI`, `SCOREEE`
  - [x] `scale_values`, `indicators`, `grade_result`

### 3-3-2 Hot-Water Branch
- [x] `POST /calc/bersn/formulas/hotwater-full` returns:
  - [x] `hotwater` block (`HPC`, `HpEUI`, `EHW`)
  - [x] weights `a,b,c,d`
  - [x] `EEI`, `SCOREEE`, scale/indicators/grade

### 3-4 / 3-5 / 3-6 / 3-7 Standalone
- [x] `score-general`
- [x] `scale-values-general`
- [x] `indicators-general`
- [x] `grade-general`
- [x] each returns expected outputs + equation trace tags

## Renewable (3-8)

### Preprocess
- [x] `POST /calc/bersn/formulas/renewable-preprocess` (PV case):
  - [x] GE formula result matches manual check
  - [x] PV-equivalent area formula (a式) matches manual check
  - [x] `Rs` computed when `AFe` provided

### Bonus Apply
- [x] `POST /calc/bersn/formulas/renewable-bonus` with `method=pv_area_method`:
  - [x] `gamma = 0.1 * T * min(Rs,1.0)`
  - [x] adjusted score (Eq.3.26)
- [x] `POST /calc/bersn/formulas/renewable-bonus` with `method=generation_method`:
  - [x] adjusted EEI by Eq.3.27
  - [x] recalculated score
  - [x] score cap `<= 1.1x` applied

## NZB (3-9)
- [x] `POST /calc/bersn/formulas/nzb-eligibility`:
  - [x] only grade `1+` is eligible
- [x] `POST /calc/bersn/formulas/nzb-balance`:
  - [x] `TE = TEUI * AFe`
  - [x] pass when `TGE >= TE`
- [x] `POST /calc/bersn/formulas/nzb-evaluate`:
  - [x] final pass requires eligibility + balance pass

## Validation / Error Contract Checks
- [x] missing required fields return `422` with:
  - `detail: "Missing required inputs: ..."`
- [x] invalid numeric ranges return `422` with clear field message (`> 0` or `>= 0`)
- [x] API proxy preserves calc validation status:
  - `error = CALC_ENGINE_VALIDATION_ERROR`
  - `calc_status = 422`
  - `calc_response.detail` present

## Automated Evidence Snapshot (2026-03-03)
- [x] Full smoke suite passed end-to-end (local Docker)
  - Evidence: `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`
  - Included checks:
    - error envelope
    - readiness / rate limit
    - calc transport (`CALC_ENGINE_TIMEOUT`, `CALC_ENGINE_UNAVAILABLE`)
    - OpenAPI runtime contract
    - validation profiles
    - golden path deterministic formulas
    - branch coverage (hot-water / renewable / NZB)
    - persistence readback (`/api/bersn/runs/:calc_run_id`)
    - performance gate (`/ready`, success rate 100%, p95 105.33ms, p99 107.02ms)
- [x] Manual formula-by-formula business sign-off completed

## Persistence Checks (API proxy routes)
- [x] Each `/api/bersn/formulas/...` call stores step output in DB
- [x] `GET /api/bersn/runs/:calc_run_id` returns stored steps

## Final Release Decision
- [x] All checklist items passed
- [x] Postman collection exported and tagged `BERSn-v1.0-frozen`
- [ ] Contract file and checklist committed in same release PR
