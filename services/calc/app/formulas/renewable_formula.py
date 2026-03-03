"""BERSn Section 3-8 renewable bonus helpers (Table 3.5 / Eq. 3.25~3.27)."""

from __future__ import annotations

from typing import Any, Dict, Optional


def _to_float(value: Any, name: str) -> float:
    try:
        return float(value)
    except Exception as exc:
        raise ValueError(f"{name} must be numeric") from exc


def _normalized_type(raw: Any) -> str:
    if raw is None:
        raise ValueError("renewable_type is required")
    return str(raw).strip().lower()


def _resolve_t_factor(raw_t: Optional[Any], usage_type: Optional[str], table: Dict[str, Any]) -> float:
    if raw_t is not None:
        t = _to_float(raw_t, "T")
        if t < 0.0 or t > 1.0:
            raise ValueError("T must be between 0 and 1")
        return t

    if not usage_type:
        raise ValueError("Provide either T or renewable_power_usage_type")

    usage_map = table.get("renewable_power_usage_factor_T", {}) or {}
    key = str(usage_type).strip().lower()
    if key not in usage_map:
        allowed = ", ".join(sorted(usage_map.keys()))
        raise ValueError(f"Unknown renewable_power_usage_type '{usage_type}'. Allowed: {allowed}")
    return _to_float(usage_map[key], "renewable_power_usage_factor_T")


def compute_renewable_preprocess(inputs: Dict[str, Any], table_3_5: Dict[str, Any], trace=None) -> Dict[str, Any]:
    """
    Compute GE and PV-equivalent area according to Table 3.5.

    Expected input shape:
      renewable_type: pv|solar_thermal|wind_power|small_hydropower|biomass|afforestation
      optional T or renewable_power_usage_type
      optional AFe (to derive Rs)
      plus method-specific fields
    """
    constants = (table_3_5 or {}).get("global_constants", {}) or {}
    pv_corr = _to_float(constants.get("pv_generation_correction_factor", 0.9), "pv_generation_correction_factor")
    days_per_year = _to_float(constants.get("days_per_year", 365), "days_per_year")
    pv_area_per_kw = _to_float(constants.get("pv_area_per_kw_m2_per_kw", 7.0), "pv_area_per_kw_m2_per_kw")
    lng_factor = _to_float(constants.get("lng_co2_conversion_factor_kgco2_per_m3", 2.09), "lng_co2_conversion_factor_kgco2_per_m3")
    forest_factor = _to_float(constants.get("afforestation_co2_conversion_factor_kgco2_per_m2_yr", 1.5), "afforestation_co2_conversion_factor_kgco2_per_m2_yr")

    renewable_type = _normalized_type(inputs.get("renewable_type"))
    pv_eff = inputs.get("pv_max_generation_efficiency_kwh_per_kw_day")
    if pv_eff is None:
        raise ValueError("pv_max_generation_efficiency_kwh_per_kw_day is required")
    pv_eff = _to_float(pv_eff, "pv_max_generation_efficiency_kwh_per_kw_day")
    if pv_eff <= 0:
        raise ValueError("pv_max_generation_efficiency_kwh_per_kw_day must be > 0")

    t_factor = _resolve_t_factor(inputs.get("T"), inputs.get("renewable_power_usage_type"), table_3_5)

    ge: Optional[float] = None
    detail: Dict[str, Any] = {"renewable_type": renewable_type}

    if renewable_type == "pv":
        cap_kw = _to_float(inputs.get("PV_installed_capacity_kW"), "PV_installed_capacity_kW")
        ge = t_factor * cap_kw * pv_eff * pv_corr * days_per_year
        detail["equation"] = "Table 3.5 PV GE"
        detail["PV_installed_capacity_kW"] = cap_kw
    elif renewable_type in ("solar_thermal", "wind_power", "small_hydropower"):
        if inputs.get("GE") is None:
            raise ValueError(f"GE is required for renewable_type '{renewable_type}'")
        ge = _to_float(inputs.get("GE"), "GE")
        detail["equation"] = "Table 3.5 direct GE"
    elif renewable_type == "biomass":
        beta1 = _to_float(inputs.get("beta1"), "beta1")
        if beta1 <= 0:
            raise ValueError("beta1 must be > 0")
        if inputs.get("LNGC") is not None:
            lngc = _to_float(inputs.get("LNGC"), "LNGC")
        else:
            lng_m3 = _to_float(inputs.get("annual_biomass_heat_equivalent_as_LNG_m3"), "annual_biomass_heat_equivalent_as_LNG_m3")
            lngc = lng_m3 * lng_factor
        ge = lngc / beta1
        detail["equation"] = "Table 3.5 biomass"
        detail["LNGC"] = lngc
    elif renewable_type == "afforestation":
        beta1 = _to_float(inputs.get("beta1"), "beta1")
        if beta1 <= 0:
            raise ValueError("beta1 must be > 0")
        if inputs.get("FC") is not None:
            fc = _to_float(inputs.get("FC"), "FC")
        else:
            aff_area = _to_float(inputs.get("afforestation_area_m2"), "afforestation_area_m2")
            fc = aff_area * forest_factor
        ge = fc / beta1
        detail["equation"] = "Table 3.5 afforestation"
        detail["FC"] = fc
    else:
        raise ValueError("Unsupported renewable_type")

    if ge is None:
        raise ValueError("Failed to compute GE")
    if ge < 0:
        raise ValueError("GE must be >= 0")

    pv_equivalent_area = pv_area_per_kw * ge / (pv_eff * pv_corr * days_per_year)
    if pv_equivalent_area < 0:
        raise ValueError("PV equivalent area must be >= 0")

    rs = None
    if inputs.get("AFe") is not None:
        afe = _to_float(inputs.get("AFe"), "AFe")
        if afe <= 0:
            raise ValueError("AFe must be > 0 when provided")
        rs = pv_equivalent_area / afe

    output = {
        "renewable_type": renewable_type,
        "T": t_factor,
        "GE": ge,
        "pv_equivalent_area_m2": pv_equivalent_area,
        "Rs": rs,
        "pv_max_generation_efficiency_kwh_per_kw_day": pv_eff,
    }
    output.update(detail)

    if trace is not None:
        trace.add_step(
            description="Compute renewable preprocess (Table 3.5)",
            inputs={
                "equation": "Table 3.5",
                "renewable_type": renewable_type,
                "T": t_factor,
                "pv_max_generation_efficiency_kwh_per_kw_day": pv_eff,
            },
            result=output,
        )
    return output


def apply_renewable_bonus(inputs: Dict[str, Any], trace=None) -> Dict[str, Any]:
    """
    Apply score/EEI adjustment for Section 3-8.

    methods:
      - pv_area_method (Eq. 3.25 + 3.26)
      - generation_method (Eq. 3.27 + score cap)
    """
    method = str(inputs.get("method", "")).strip().lower()
    if method not in ("pv_area_method", "generation_method"):
        raise ValueError("method must be 'pv_area_method' or 'generation_method'")

    if method == "pv_area_method":
        score_before = _to_float(inputs.get("SCOREEE_before"), "SCOREEE_before")
        t_factor = _to_float(inputs.get("T"), "T")
        rs = _to_float(inputs.get("Rs"), "Rs")
        if t_factor < 0 or t_factor > 1:
            raise ValueError("T must be between 0 and 1")
        if rs < 0:
            raise ValueError("Rs must be >= 0")
        rs_limited = min(rs, 1.0)
        gamma = 0.1 * t_factor * rs_limited
        score_after = score_before * (1.0 + gamma)
        output = {
            "method": "pv_area_method",
            "gamma": gamma,
            "Rs_input": rs,
            "Rs_used": rs_limited,
            "SCOREEE_before": score_before,
            "SCOREEE_after": score_after,
            "equations": ["3.25", "3.26"],
        }
    else:
        eei_before = _to_float(inputs.get("EEI_before"), "EEI_before")
        eui_star = _to_float(inputs.get("EUI_star"), "EUI_star")
        afe = _to_float(inputs.get("AFe"), "AFe")
        ge = _to_float(inputs.get("GE"), "GE")
        if eui_star <= 0:
            raise ValueError("EUI_star must be > 0")
        if afe <= 0:
            raise ValueError("AFe must be > 0")
        eei_after = eei_before * ((eui_star * afe - ge) / (afe * eui_star))
        if eei_after < 0:
            eei_after = 0.0

        score_before = inputs.get("SCOREEE_before")
        if score_before is None:
            raise ValueError("SCOREEE_before is required for generation_method score cap")
        score_before = _to_float(score_before, "SCOREEE_before")

        score_after_raw = _to_float(inputs.get("SCOREEE_after_raw"), "SCOREEE_after_raw")
        score_cap = 1.1 * score_before
        score_after = min(score_after_raw, score_cap)
        output = {
            "method": "generation_method",
            "EEI_before": eei_before,
            "EEI_after": eei_after,
            "GE": ge,
            "SCOREEE_before": score_before,
            "SCOREEE_after_raw": score_after_raw,
            "SCOREEE_cap_110_percent": score_cap,
            "SCOREEE_after": score_after,
            "equations": ["3.27", "score_cap_1.1x"],
        }

    if trace is not None:
        trace.add_step(
            description="Apply renewable bonus (Section 3-8)",
            inputs={"equation": output["equations"], "method": method},
            result=output,
        )
    return output
