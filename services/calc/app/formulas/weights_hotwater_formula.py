"""
Compute weighting factors a, b, c and d for buildings with a central hot‑water
system (Eqs. 3.11‑3.14).

These weights are the ratios of AEUI, LEUI, EtEUI and HpEUI to their sum,
applicable to hospitals, hotels and other buildings with hot water【173577551963776†L1729-L1739】.
"""

from app.utils.trace_builder import TraceBuilder


def calculate_weights_hotwater(aeui: float, leui: float, eteui: float, hpeui: float, trace: TraceBuilder) -> dict:
    """Calculate weights a, b, c, d for the hot-water branch.

    Args:
        aeui: Baseline air‑conditioning EUI.
        leui: Baseline lighting EUI.
        eteui: Baseline elevator EUI.
        hpeui: Baseline hot‑water EUI.
        trace: TraceBuilder to record the calculation.

    Returns:
        A dictionary containing weights 'a', 'b', 'c' and 'd'.
    """
    denominator = aeui + leui + eteui + hpeui
    if denominator == 0:
        a = b = c = d = 0.0
    else:
        a = aeui / denominator
        b = leui / denominator
        c = eteui / denominator
        d = hpeui / denominator
    trace.add_step(
        description="Calculate weights a, b, c, d (Eqs. 3.11‑3.14)",
        inputs={"AEUI": aeui, "LEUI": leui, "EtEUI": eteui, "HpEUI": hpeui},
        result={"a": a, "b": b, "c": c, "d": d},
    )
    return {"a": a, "b": b, "c": c, "d": d}
