"""
Compute the energy efficiency index (EEI) for buildings with central hot water (Eq. 3.15).

EEI = a × (EAC − EEV × Es) + b × EL + c × Et + d × EHW【173577551963776†L1729-L1739】.
"""

from app.utils.trace_builder import TraceBuilder


def calculate_eei_hotwater(a: float, b: float, c: float, d: float,
                           eac: float, eev: float, es: float,
                           el: float, et: float, ehw: float,
                           trace: TraceBuilder) -> float:
    """Calculate EEI for buildings with a central hot-water system.

    Args:
        a, b, c, d: Weighting factors for air-conditioning, lighting, elevators and hot water.
        eac: Air-conditioning efficiency EAC.
        eev: Envelope efficiency EEV.
        es: Maximum saving when EEV=1 (Es).
        el: Lighting efficiency EL.
        et: Elevator efficiency Et.
        ehw: Hot-water efficiency EHW.
        trace: TraceBuilder for logging.

    Returns:
        The calculated EEI value.
    """
    ac_term = eac - eev * es
    eei = a * ac_term + b * el + c * et + d * ehw
    trace.add_step(
        description="Calculate EEI with hot water (Eq. 3.15)",
        inputs={"a": a, "b": b, "c": c, "d": d, "EAC": eac, "EEV": eev, "Es": es, "EL": el, "Et": et, "EHW": ehw},
        result=eei,
    )
    return eei
