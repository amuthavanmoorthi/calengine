"""
Compute the energy efficiency index (EEI) for buildings without hot water (Eq. 3.6).

EEI combines the weighted contributions of air‑conditioning, lighting and
elevator efficiencies according to the formula:
EEI = a × (EAC − EEV × Es) + b × EL + c × Et【173577551963776†L1589-L1596】.
"""

from app.utils.trace_builder import TraceBuilder


def calculate_eei_bersn(a: float, b: float, c: float,
                        eac: float, eev: float, es: float,
                        el: float, et: float,
                        trace: TraceBuilder) -> float:
    """Calculate EEI for the standard (no hot-water) branch.

    Args:
        a: Weight for air-conditioning.
        b: Weight for lighting.
        c: Weight for elevators.
        eac: Air-conditioning efficiency EAC.
        eev: Envelope efficiency EEV.
        es: Maximum saving when EEV=1 (Es).
        el: Lighting efficiency EL.
        et: Elevator efficiency Et.
        trace: TraceBuilder for logging.

    Returns:
        The calculated energy efficiency index (EEI).
    """
    ac_term = eac - eev * es
    eei = a * ac_term + b * el + c * et
    trace.add_step(
        description="Calculate EEI (Eq. 3.6)",
        inputs={"a": a, "b": b, "c": c, "EAC": eac, "EEV": eev, "Es": es, "EL": el, "Et": et},
        result=eei,
    )
    return eei
