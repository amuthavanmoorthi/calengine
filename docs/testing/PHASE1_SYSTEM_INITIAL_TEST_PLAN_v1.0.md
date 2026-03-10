# Phase-1 System Initial Test Plan (系統初測)

Date: 2026-03-09  
Scope: BERSn core engine (Phase 1)

## 1. Objective
- Verify Phase-1 calculation logic for general/hot-water/mixed-use/boundary cases.
- Produce acceptance evidence for government review.

## 2. Environment Checklist
- Backend/API reachable.
- Calc engine reachable.
- Frontend login available for reviewer account.
- Database connected.
- No crash in login -> calculation path.

## 3. Test Categories
1. General non-residential (no hot water)
2. Central hot-water case
3. Mixed-use building case
4. Boundary cases:
   - 99m2 vs 100m2 excluded-zone rule
   - 4.9% vs 5.0% mixed-use threshold
   - Score/grade threshold crossing

## 4. Execution
- Automated runner:
  - `cd /Users/gaby/114-1/Internship/One Work/Project Bern/BERSn/CalEngine/services/api`
  - `API_BASE_URL=http://localhost:8081 npm run test:phase1:initial`
- Outputs:
  - `/Users/gaby/114-1/Internship/One Work/Project Bern/BERSn/CalEngine/docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.json`
  - `/Users/gaby/114-1/Internship/One Work/Project Bern/BERSn/CalEngine/docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.md`

## 5. Pass Criteria
- All Phase-1 test cases pass.
- No critical defect.
- Evidence files generated and archived.

## 6. Defect Handling
- Log each issue in:
  - `/Users/gaby/114-1/Internship/One Work/Project Bern/BERSn/CalEngine/docs/testing/PHASE1_DEFECT_LOG_v1.0.csv`
- Include severity, impact, owner, fix status.
