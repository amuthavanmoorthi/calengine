# Phase-1 System Initial Test Results

- generated_at: 2026-03-09T09:16:06.104Z
- api_base_url: http://localhost:8080
- total_cases: 6
- pass: 6
- fail: 0

## Case Summary

| Case ID | Category | Result | Notes |
|---|---|---:|---|
| P1-TC-01 | Core path | PASS |  |
| P1-TC-02 | Core path | PASS |  |
| P1-TC-03 | Core path | PASS |  |
| P1-TC-04A | Boundary | PASS |  |
| P1-TC-04B | Boundary | PASS |  |
| P1-TC-04C | Boundary | PASS | Threshold uses current Section 3-7 mapping behavior. |

## Detailed Results

### P1-TC-01 - General non-residential (no hot water)
- category: Core path
- result: PASS
- expected: EEI/SCOREEE/grade_result returned with valid numeric values.
- actual: EEI=0.6565272918124562, SCORE=69.12969442500585, grade=3

### P1-TC-02 - Central hot-water branch
- category: Core path
- result: PASS
- expected: Hot-water outputs (HpEUI/EHW) and hot-water weight d are produced.
- actual: HpEUI=4.72668988235294, EHW=1.56, d=0.06567241483653097

### P1-TC-03 - Mixed-use building (weighting and threshold filter)
- category: Core path
- result: PASS
- expected: Sub-segment under both 5% and 1000m2 is excluded from evaluated set.
- actual: evaluated_segment_count=2, segment[1].included=false

### P1-TC-04A - Boundary: excluded zone area 99m2 vs 100m2
- category: Boundary
- result: PASS
- expected: 99m2 storage/equipment(no AC)=not excluded; 100m2=excluded.
- actual: 99m2 include_in_afk=false, 100m2 include_in_afk=true

### P1-TC-04B - Boundary: mixed-use area ratio 4.9% vs 5.0%
- category: Boundary
- result: PASS
- expected: 4.9% segment excluded, 5.0% segment included.
- actual: 4.9% include=false, 5.0% include=true

### P1-TC-04C - Boundary: grade threshold crossing (EUI*)
- category: Boundary
- result: PASS
- expected: Small EUI* change across threshold changes grade_by_eui bucket.
- actual: below(54.999)=3, above(55.001)=4
- notes: Threshold uses current Section 3-7 mapping behavior.

