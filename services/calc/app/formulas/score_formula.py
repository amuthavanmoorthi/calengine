"""
BERSn Technical Manual
Section: 3-4
Equation: 3.16a, 3.16b
Page: (refer PDF Section 3-4)

SCOREEE calculation based on EEI.

Precision policy (set 2026-05-21 after review by Carl Yu, energy consultant):
- The full-precision EEI value produced by `calculate_eei` is passed in here
  WITHOUT being rounded to 2 decimal places first.
- This matches the calc-engine convention used by independent reviewer tools
  and avoids accumulated rounding error in SCOREEE.
- Some agency reports round EEI to 2dp before applying the formula (e.g.
  EEI 0.5703 -> 0.57 -> SCOREEE 80.6667 -> 80.68). Our platform deliberately
  uses the full precision path (e.g. EEI 0.5703 -> SCOREEE 80.626666...),
  which is mathematically more accurate. Final display rounding of SCOREEE
  is the caller's responsibility (typically 2-3 decimals for UI / reports).
- Both EEI (raw) and SCOREEE (raw) are recorded verbatim in the trace log
  so reviewers can reproduce the calculation step by step.
"""

def calculate_score(eei: float, trace=None) -> float:

    if eei < 0:
        raise ValueError("EEI cannot be negative")

    if eei <= 0.8:
        # Equation 3.16a — full EEI precision, no early rounding.
        score = 50 + 40 * (0.8 - eei) / 0.3
        equation_used = "3.16a"
    else:
        # Equation 3.16b — full EEI precision, no early rounding.
        score = 50 * (2.0 - eei) / 1.2
        equation_used = "3.16b"

    # Lower bound only: SCOREEE cannot be negative. The historical 100-upper
    # cap has been removed per reviewer guidance — actual scores above 100
    # (e.g. very low-EEI buildings) must be displayed as computed.
    if score < 0.0:
        score = 0.0

    if trace:
        trace.add_step(
            description="SCOREEE Calculation (Eq. 3.16a/3.16b)",
            inputs={
                "EEI": eei,
                "EEI_precision_policy": "full_precision_no_early_rounding",
                "equation": equation_used,
            },
            result={
                "SCOREEE_raw": score,
                "note": (
                    "Computed with full EEI precision per platform policy. "
                    "Display rounding is performed by the consumer; the raw "
                    "value above is the authoritative result."
                ),
            },
        )

    return score

