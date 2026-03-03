"""
Compute the elevator energy-use intensity baseline EtEUI (Eq. 3.2) for BERSn.

The baseline is defined as (0.6 × Σ(Nej × Eelj × YOHj)) / AFe, where 0.6
represents a 60 % utilisation rate【173577551963776†L1585-L1616】.
"""

from typing import List, Dict

from app.utils.trace_builder import TraceBuilder


def calculate_eteui(elevators: List[Dict[str, float]], afe: float, trace: TraceBuilder) -> float:
    """Calculate EtEUI using the parameters for elevator groups.

    Args:
        elevators: A list of dictionaries describing elevator groups. Each
            dictionary should contain 'Nej', 'Eelj' and 'YOHj' keys.
        afe: The evaluation floor area AFe (m²).
        trace: TraceBuilder used to log the computation.

    Returns:
        The elevator energy-use intensity baseline (kWh/(m²·yr)).
    """
    numerator_sum = 0.0
    for group in elevators:
        Nej = float(group.get("Nej", 0))
        Eelj = float(group.get("Eelj", 0))
        YOHj = float(group.get("YOHj", 0))
        numerator_sum += Nej * Eelj * YOHj
    numerator = 0.6 * numerator_sum
    eteui = numerator / afe if afe > 0 else 0.0
    trace.add_step(
        description="Calculate EtEUI (Eq. 3.2)",
        inputs={"elevator_groups": elevators, "AFe": afe, "numerator": numerator},
        result=eteui,
    )
    return eteui
