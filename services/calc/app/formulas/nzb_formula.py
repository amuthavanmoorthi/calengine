"""BERSn Section 3-9 NZB evaluation helpers."""

from __future__ import annotations

from typing import Any, Dict


def _to_float(value: Any, name: str) -> float:
    try:
        return float(value)
    except Exception as exc:
        raise ValueError(f"{name} must be numeric") from exc


def _normalize_grade(value: Any) -> str:
    if value is None:
        raise ValueError("grade is required")
    return str(value).strip().upper()


def check_nzb_grade_gate(grade: Any, trace=None) -> Dict[str, Any]:
    """Rule #1: NZB requires grade 1+."""
    normalized = _normalize_grade(grade)
    eligible = normalized == "1+"
    result = {
        "grade": normalized,
        "is_grade_eligible": eligible,
        "rule": "3-9-rule-1",
        "reason": "Eligible only when grade is 1+." if eligible else "Not eligible because grade is not 1+.",
    }
    if trace is not None:
        trace.add_step(
            description="Check NZB grade gate (Section 3-9 rule #1)",
            inputs={"equation": "3-9-rule-1", "grade": normalized},
            result=result,
        )
    return result


def compute_nzb_balance(teui: Any, afe: Any, tge: Any, trace=None) -> Dict[str, Any]:
    """Rule #2: TGE >= TE where TE = TEUI * AFe."""
    teui_f = _to_float(teui, "TEUI")
    afe_f = _to_float(afe, "AFe")
    tge_f = _to_float(tge, "TGE")
    if teui_f < 0:
        raise ValueError("TEUI must be >= 0")
    if afe_f <= 0:
        raise ValueError("AFe must be > 0")
    if tge_f < 0:
        raise ValueError("TGE must be >= 0")

    te = teui_f * afe_f
    margin = tge_f - te
    pass_balance = margin >= 0

    result = {
        "TEUI": teui_f,
        "AFe": afe_f,
        "TE": te,
        "TGE": tge_f,
        "nzb_balance_margin": margin,
        "is_balance_pass": pass_balance,
        "rule": "3-9-rule-2",
        "equation": "TE = TEUI * AFe; pass when TGE >= TE",
    }
    if trace is not None:
        trace.add_step(
            description="Compute NZB energy balance (Section 3-9 rule #2)",
            inputs={"equation": "TE = TEUI * AFe", "TEUI": teui_f, "AFe": afe_f, "TGE": tge_f},
            result=result,
        )
    return result
