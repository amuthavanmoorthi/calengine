# BERSn Trace Audit Matrix (v1.0)

## Purpose
This document maps BERSn equations/rules to:
- calc endpoint
- source code file/function
- expected trace equation tags (`trace.formulas_used`)

This is intended for government audit review and implementation verification.

## Core Mapping

| Section | Equation/Rule | Calc Endpoint | Code Location | Trace Tag |
|---|---|---|---|---|
| 3-1 | Classification + mixed-use + 5%/1000m² | `POST /api/bersn/classification/normalize` | `services/api/src/utils/bersnClassification.js` | n/a (API normalization output) |
| 3-2-1 | Excluded zone rule + ΣAfk | `POST /calc/bersn/formulas/afe` | `services/calc/app/formulas/Energy_Analysis/afe_formula.py` | step description + reasons |
| 3.1 | `AFe = AF - ΣAfk` | `POST /calc/bersn/formulas/afe` | `.../afe_formula.py` | `Eq. 3.1` (in step description) |
| 3.2 | `EtEUI` | `POST /calc/bersn/formulas/eteui` | `services/calc/app/formulas/eteui_formula.py` | `Eq. 3.2` |
| 3.3~3.5 | `a,b,c` | `POST /calc/bersn/formulas/weights` | `services/calc/app/formulas/weights_formula.py` | `3.3-3.5` (step description) |
| 3.6 | General EEI | `POST /calc/bersn/formulas/eei-general` | `services/calc/app/formulas/eei_formula_bersn.py` | `3.6` (step description) |
| 3.7~3.10 | Hot-water preprocess | `POST /calc/bersn/formulas/hotwater-preprocess` | `services/calc/app/formulas/hotwater_formula.py` | `3.7`, `3.8a`, `3.8b`, `3.9`, `3.10` |
| 3.11~3.14 | `a,b,c,d` hot-water weights | `POST /calc/bersn/formulas/hotwater-full` | `services/calc/app/formulas/weights_hotwater_formula.py` | `3.11-3.14` (step description) |
| 3.15 | EEI with hot-water term | `POST /calc/bersn/formulas/hotwater-full` | `services/calc/app/formulas/eei_formula_hotwater.py` | `3.15` (step description) |
| 3.16a/3.16b | SCOREEE | `POST /calc/bersn/formulas/score-general` | `services/calc/app/formulas/score_formula.py` | `3.16a` or `3.16b` |
| 3.17~3.20 | Scale values | `POST /calc/bersn/formulas/scale-values-general` | `services/calc/app/formulas/scale_formula.py` | `3.17`, `3.18`, `3.19`, `3.20` |
| 3.21~3.24 | Indicators | `POST /calc/bersn/formulas/indicators-general` | `services/calc/app/formulas/indicators_formula.py` | `3.21a/3.21b`, `3.22`, `3.23`, `3.24` |
| 3-7 | Grade mapping | `POST /calc/bersn/formulas/grade-general` | `services/calc/app/formulas/grade_formula.py` | `3-7` |
| 3-8 | Renewable preprocess Table 3.5 | `POST /calc/bersn/formulas/renewable-preprocess` | `services/calc/app/formulas/renewable_formula.py` | `Table 3.5` |
| 3.25/3.26 | PV area method bonus | `POST /calc/bersn/formulas/renewable-bonus` | `.../renewable_formula.py` | `3.25`, `3.26` |
| 3.27 + cap | Generation method bonus | `POST /calc/bersn/formulas/renewable-bonus` | `.../renewable_formula.py` | `3.27`, `score_cap_1.1x` (+ score equation tag) |
| 3-9 rule #1 | NZB grade gate | `POST /calc/bersn/formulas/nzb-eligibility` | `services/calc/app/formulas/nzb_formula.py` | `3-9-rule-1` |
| 3-9 rule #2 | NZB balance (`TE = TEUI * AFe`) | `POST /calc/bersn/formulas/nzb-balance` | `.../nzb_formula.py` | `TE = TEUI * AFe` |
| 3-9 final | NZB final decision | `POST /calc/bersn/formulas/nzb-evaluate` | `services/calc/app/main.py` | `3-9-final` |

## Audit Trail Storage Points

1. Input snapshot: `bersn_input_versions`
2. Run status/timing: `calc_runs`
3. Final result payload: `calc_results`
4. Step-by-step payloads: `calc_step_results`

Implementation:
- `services/api/src/models/calcModel.js`
- `services/api/src/controllers/calcController.js`

## Operational Verification

1. Run formula endpoint (API proxy preferred).
2. Verify response includes `trace.steps` and `trace.formulas_used`.
3. Query `GET /api/bersn/runs/:calc_run_id` and verify step snapshot exists.
