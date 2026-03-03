"""
BERSn Technical Manual
Appendix 2 - EL formula

Eq. 17:
  EL = (Σ(nij * wij * βi)) / (Σ(LPDi * Ai)), with EL >= 0.4
"""


def calculate_el(numerator_total: float, denominator_total: float, trace=None) -> dict:
    if denominator_total <= 0:
        raise ValueError("denominator_total must be positive")

    raw = numerator_total / denominator_total
    el = max(0.4, raw)

    result = {
        "EL_raw": raw,
        "EL": el,
        "equation": "17",
    }

    if trace:
        trace.add_step(
            description="Calculate EL (Eq. 17)",
            inputs={
                "equation": "17",
                "numerator_total": numerator_total,
                "denominator_total": denominator_total,
            },
            result=result,
        )

    return result


def aggregate_el_totals(spaces: list) -> dict:
    """
    Aggregate per-space inputs into Eq.17 totals.

    Each space item should provide:
      - Ai
      - LPDi
      - numerator_power (already aggregated Σ(nij*wij*βi) for that space)
    """
    numerator_total = 0.0
    denominator_total = 0.0
    for idx, s in enumerate(spaces):
        try:
            ai = float(s["Ai"])
            lpdi = float(s["LPDi"])
            numerator_power = float(s["numerator_power"])
        except Exception:
            raise ValueError(f"Invalid spaces[{idx}] fields: require Ai, LPDi, numerator_power")

        numerator_total += numerator_power
        denominator_total += (lpdi * ai)

    return {
        "numerator_total": numerator_total,
        "denominator_total": denominator_total,
    }
