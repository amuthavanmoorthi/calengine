"""
BERSn Technical Manual
Section: 3-4
Equation: 3.16a, 3.16b
Page: (refer PDF Section 3-4)

SCOREEE calculation based on EEI.
"""

def calculate_score(eei: float, trace=None) -> float:

    if eei < 0:
        raise ValueError("EEI cannot be negative")

    if eei <= 0.8:
        # Equation 3.16a
        score = 50 + 40 * (0.8 - eei) / 0.3
        equation_used = "3.16a"
    else:
        # Equation 3.16b
        score = 50 * (2.0 - eei) / 1.2
        equation_used = "3.16b"

    # Clamp score between 0 and 100
    score = max(0.0, min(100.0, score))

    if trace:
        trace.add_step(
            description="SCOREEE Calculation",
            inputs={"EEI": eei, "equation": equation_used},
            result=score
        )

    return score

