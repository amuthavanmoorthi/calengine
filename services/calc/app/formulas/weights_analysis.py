# app/formulas/weights_formula.py
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple
from app.utils.trace_builder import TraceBuilder


def _require_str(inputs: Dict[str, Any], key: str) -> str:
    v = inputs.get(key)
    if v is None or str(v).strip() == "":
        raise ValueError(f"Missing {key}")
    return str(v).strip()


def _require_float(inputs: Dict[str, Any], key: str) -> float:
    v = inputs.get(key)
    if v is None:
        raise ValueError(f"Missing {key}")
    try:
        return float(v)
    except Exception:
        raise ValueError(f"Invalid {key}: must be numeric")


def calculate_weights_Analysis(
    building_code: str,
    operation_mode: str,
    et_eui: float,
    baseline_table: Dict[str, Any],
    trace: TraceBuilder,
) -> Dict[str, float]:
    """
    Eqs (3.3)-(3.5):
      Σ = AEUI + LEUI + EtEUI
      a = AEUI/Σ, b = LEUI/Σ, c = EtEUI/Σ
    AEUI/LEUI are from Appendix 1 Table A.
    """

    # Lookup row
    row = baseline_table.get("baseline_eui", {}).get(building_code)
    if not row:
        raise ValueError(f"Unknown building_code: {building_code}")

    if operation_mode not in ("full_year_ac", "intermittent_ac"):
        raise ValueError("operation_mode must be 'full_year_ac' or 'intermittent_ac'")

    mode_vals = row.get(operation_mode)
    if mode_vals is None:
        raise ValueError(f"{building_code} has no values for operation_mode={operation_mode}")

    a_eui = float(mode_vals.get("AEUI"))
    l_eui = float(mode_vals.get("LEUI"))

    sigma = a_eui + l_eui + float(et_eui)
    if sigma <= 0:
        raise ValueError("Invalid denominator Σ (AEUI+LEUI+EtEUI) <= 0")

    a = a_eui / sigma
    b = l_eui / sigma
    c = float(et_eui) / sigma

    trace.add_step(
        description="Calculate weight coefficients a,b,c (Eqs. 3.3–3.5)",
        inputs={
            "building_code": building_code,
            "operation_mode": operation_mode,
            "AEUI": a_eui,
            "LEUI": l_eui,
            "EtEUI": float(et_eui),
            "Sigma": sigma,
        },
        result={"a": a, "b": b, "c": c},
    )

    return {
        "AEUI": a_eui,
        "LEUI": l_eui,
        "EtEUI": float(et_eui),
        "SigmaEUI": sigma,
        "a": a,
        "b": b,
        "c": c,
    }