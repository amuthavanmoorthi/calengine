"""
Compute weighting factors a, b and c for BERSn EEI calculation (Eqs. 3.3‑3.5).

The weights determine the relative contributions of the air-conditioning,
lighting and elevator subsystems. Each weight is the ratio of the corresponding
baseline EUI (AEUI, LEUI, EtEUI) to the sum of all three【173577551963776†L1589-L1594】.
"""

from app.utils.trace_builder import TraceBuilder


def calculate_weights(aeui: float, leui: float, eteui: float, trace: TraceBuilder) -> dict:
    """Calculate weights a, b, c.

    Args:
        aeui: Baseline air‑conditioning EUI (AEUI).
        leui: Baseline lighting EUI (LEUI).
        eteui: Baseline elevator EUI (EtEUI).
        trace: TraceBuilder to record the calculation.

    Returns:
        A dictionary containing weights 'a', 'b' and 'c'.
    """
    denominator = aeui + leui + eteui
    if denominator == 0:
        a = b = c = 0.0
    else:
        a = aeui / denominator
        b = leui / denominator
        c = eteui / denominator
    trace.add_step(
        description="Calculate weights a, b, c (Eqs. 3.3‑3.5)",
        inputs={"AEUI": aeui, "LEUI": leui, "EtEUI": eteui},
        result={"a": a, "b": b, "c": c},
    )
    return {"a": a, "b": b, "c": c}

