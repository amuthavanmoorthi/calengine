"""
Compute the evaluation floor area AFe (Eq. 3.1) according to BERSn.

This module supports:
1) Legacy mode: caller passes a plain list of exempt area numbers.
2) 3-2-1 rule mode: caller passes structured excluded-zone objects and the
   module applies BERSn no-evaluation-zone rules (免評估分區) before summing ΣAfk.
"""

from collections import defaultdict
from typing import Any, Dict, List, Tuple

from app.utils.trace_builder import TraceBuilder


# Zone types that are always excludable under 3-2-1 when area is provided.
ALWAYS_EXCLUDABLE_ZONE_TYPES = {
    "outdoor_floor_area",      # 室外樓地板面積
    "air_raid_shelter",        # 防空避難空間
    "indoor_parking",          # 室內停車區
}

# Zone type that requires the >=100m2 and no-AC rule.
STORAGE_EQUIPMENT_ZONE_TYPE = "storage_or_equipment_space"  # 儲藏/設備空間


def _to_float(value: Any, field_name: str) -> float:
    """Convert a value to float and raise ValueError with field context on failure."""
    try:
        return float(value)
    except Exception as exc:
        raise ValueError(f"{field_name} must be numeric") from exc


def _normalize_excluded_zone_item(index: int, item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize one excluded-zone object from API input into a strict internal form."""
    zone_type = item.get("type")
    if not zone_type:
        raise ValueError(f"excluded_zones[{index}].type is required")

    area_m2 = _to_float(item.get("area_m2"), f"excluded_zones[{index}].area_m2")
    if area_m2 < 0:
        raise ValueError(f"excluded_zones[{index}].area_m2 must be >= 0")

    # For storage/equipment spaces, AC status affects eligibility (3-2-1).
    has_air_conditioning = item.get("has_air_conditioning")
    if zone_type == STORAGE_EQUIPMENT_ZONE_TYPE:
        if has_air_conditioning is None:
            raise ValueError(
                f"excluded_zones[{index}].has_air_conditioning is required for type '{STORAGE_EQUIPMENT_ZONE_TYPE}'"
            )
        has_air_conditioning = bool(has_air_conditioning)
    else:
        # For non-storage types, AC status does not affect 3-2-1 eligibility.
        has_air_conditioning = None

    # Adjacent storage/equipment rooms can be combined to apply the >=100m2 rule.
    adjacent_group_id = item.get("adjacent_group_id")
    if adjacent_group_id is not None:
        adjacent_group_id = str(adjacent_group_id)

    return {
        "type": str(zone_type),
        "area_m2": area_m2,
        "has_air_conditioning": has_air_conditioning,
        "adjacent_group_id": adjacent_group_id,
        "note": item.get("note"),
    }


def evaluate_excluded_zones(excluded_zones: List[Dict[str, Any]], trace: TraceBuilder) -> Dict[str, Any]:
    """
    Apply BERSn section 3-2-1 excluded-zone rules and compute ΣAfk.

    Returns a dictionary with:
      - afk_total_m2: the sum ΣAfk
      - evaluated_zones: per-item inclusion decisions for debugging/audit
    """
    # Normalize inputs first so later logic can rely on field existence/type.
    normalized = [
        _normalize_excluded_zone_item(index=i, item=item)
        for i, item in enumerate(excluded_zones)
    ]

    # Group storage/equipment spaces by adjacency group for the >=100m2 combined-area rule.
    storage_group_area_totals: Dict[str, float] = defaultdict(float)
    for idx, zone in enumerate(normalized):
        if zone["type"] != STORAGE_EQUIPMENT_ZONE_TYPE:
            continue
        # When no adjacency id is given, treat the item as its own standalone group.
        group_id = zone["adjacent_group_id"] or f"__self__{idx}"
        storage_group_area_totals[group_id] += zone["area_m2"]

    evaluated_zones: List[Dict[str, Any]] = []
    afk_total_m2 = 0.0

    # Evaluate each zone against the 3-2-1 rules.
    for idx, zone in enumerate(normalized):
        zone_type = zone["type"]
        include_in_afk = False
        reason = ""

        if zone_type in ALWAYS_EXCLUDABLE_ZONE_TYPES:
            # These categories are directly excludable according to 3-2-1.
            include_in_afk = True
            reason = "Always excludable zone type under BERSn 3-2-1."

        elif zone_type == STORAGE_EQUIPMENT_ZONE_TYPE:
            # Storage/equipment zones need the no-AC and >=100m2 (single/adjacent combined) checks.
            has_ac = bool(zone["has_air_conditioning"])
            group_id = zone["adjacent_group_id"] or f"__self__{idx}"
            combined_area_m2 = storage_group_area_totals[group_id]

            if has_ac:
                include_in_afk = False
                reason = "Not excludable because storage/equipment zone has air conditioning."
            elif combined_area_m2 >= 100:
                include_in_afk = True
                reason = "Excludable because storage/equipment zone has no AC and single/adjacent combined area >=100m2."
            else:
                include_in_afk = False
                reason = "Not excludable because storage/equipment zone combined area is <100m2."
        else:
            # Unknown zone types are ignored by default to avoid accidental over-exclusion.
            include_in_afk = False
            reason = "Unknown excluded-zone type; ignored."

        if include_in_afk:
            afk_total_m2 += zone["area_m2"]

        # Save per-zone decision for debugging and audit trace.
        evaluated_zones.append(
            {
                "index": idx,
                "type": zone_type,
                "area_m2": zone["area_m2"],
                "adjacent_group_id": zone["adjacent_group_id"],
                "has_air_conditioning": zone["has_air_conditioning"],
                "include_in_afk": include_in_afk,
                "reason": reason,
            }
        )

    trace.add_step(
        description="Evaluate excluded zones (BERSn 3-2-1) and compute ΣAfk",
        inputs={"excluded_zones": excluded_zones},
        result={"AFk_total_m2": afk_total_m2, "evaluated_zones": evaluated_zones},
    )

    return {
        "afk_total_m2": afk_total_m2,
        "evaluated_zones": evaluated_zones,
    }


def calculate_afe(af: float, exempt_areas: List[float], trace: TraceBuilder) -> float:
    """Legacy AFe calculation using a plain list of exempt areas (backward compatible)."""
    total_exempt = sum(exempt_areas)
    afe = af - total_exempt
    trace.add_step(
        description="Calculate AFe (Eq. 3.1) from legacy exempt_areas list",
        inputs={"AF": af, "exempt_areas": exempt_areas, "AFk_total_m2": total_exempt},
        result=afe,
    )
    return afe


def calculate_afe_from_excluded_zones(
    af: float,
    excluded_zones: List[Dict[str, Any]],
    trace: TraceBuilder,
) -> Tuple[float, Dict[str, Any]]:
    """BERSn 3-2-1 + Eq. 3.1: compute ΣAfk from rule logic, then compute AFe."""
    exclusion_result = evaluate_excluded_zones(excluded_zones, trace)
    afk_total_m2 = exclusion_result["afk_total_m2"]
    afe = af - afk_total_m2
    trace.add_step(
        description="Calculate AFe (Eq. 3.1) using ΣAfk from 3-2-1 excluded-zone rules",
        inputs={"AF": af, "AFk_total_m2": afk_total_m2},
        result=afe,
    )
    return afe, exclusion_result
