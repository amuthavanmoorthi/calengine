"""Normalize building lookup inputs used by Appendix-2 EEV table filtering."""

from typing import Any, Dict, Optional, List
from fastapi import HTTPException

def _norm_token(x: Any) -> str:
    """Normalize free-text tokens into uppercase underscore format."""
    return str(x).strip().upper().replace(" ", "_").replace("-", "_")


_BUILDING_TYPE_ALIAS = {
    "HOTEL": "HOTEL",
    "飯店": "HOTEL",
    "旅館": "HOTEL",
}

_CLIMATE_REGION_ALIAS = {
    "NORTH": "NORTH",
    "北區": "NORTH",
    "SOUTH": "SOUTH",
    "南區": "SOUTH",
    "CENTRAL": "CENTRAL",
    "中區": "CENTRAL",
    "EAST": "EAST",
    "東區": "EAST",
}


def normalize_building_lookup(building: Dict[str, Any], require_ur: bool = False) -> Dict[str, Any]:
    """Normalize building object for robust table matching across UI input variants."""
    if not isinstance(building, dict):
        raise HTTPException(status_code=422, detail="inputs.building must be an object")

    bt_raw = building.get("building_type") or building.get("type") or building.get("category")
    if bt_raw is None:
        raise HTTPException(status_code=422, detail="inputs.building.building_type is required")
    bt = _BUILDING_TYPE_ALIAS.get(str(bt_raw).strip(), _norm_token(bt_raw))

    # climate zone / region: accept multiple keys, build candidate list
    cz_raw = building.get("climate_zone") or building.get("climate_region") or building.get("region")
    cz_candidates: List[str] = []
    climate_region_normalized: Optional[str] = None
    if cz_raw is not None:
        # keep original and also normalized
        cz_candidates.append(str(cz_raw).strip())
        normalized = _CLIMATE_REGION_ALIAS.get(str(cz_raw).strip(), _norm_token(cz_raw))
        climate_region_normalized = normalized
        cz_candidates.append(normalized)
        if normalized not in {"NORTH", "SOUTH", "CENTRAL", "EAST", "A", "B"}:
            raise HTTPException(status_code=422, detail="inputs.building.climate_region is invalid")

    # altitude
    altitude_m: Optional[float] = None
    if building.get("altitude_m") is None:
        raise HTTPException(status_code=422, detail="inputs.building.altitude_m is required")
    try:
        altitude_m = float(building["altitude_m"])
    except Exception:
        raise HTTPException(status_code=422, detail="inputs.building.altitude_m must be numeric")

    # UR (sometimes required)
    ur_val: Optional[float] = None
    if building.get("UR") is not None:
        try:
            ur_val = float(building["UR"])
        except Exception:
            raise HTTPException(status_code=422, detail="inputs.building.UR must be numeric")
    elif require_ur:
        raise HTTPException(status_code=422, detail="inputs.building.UR is required")

    # Helper classification used by EEV table matching.
    accommodation_group = "ACCOMMODATION" if bt == "HOTEL" else None
    ev_building_group_default = "HOTEL_GUESTROOM" if bt == "HOTEL" else None

    # IMPORTANT: return both normalized fields AND the _candidates block
    out: Dict[str, Any] = {
        "building_type": bt,
        "altitude_m": altitude_m,
        "UR": ur_val,
        "climate_region": climate_region_normalized,
        "climate_zone": climate_region_normalized,
        "accommodation_group": accommodation_group,
        "ev_building_group_default": ev_building_group_default,
        "_candidates": {
            "building_type": [bt],
            # if no climate zone provided, still include the key with empty list
            "climate_zone": cz_candidates,
        },
    }
    return out
