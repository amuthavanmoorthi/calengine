"""
BERSn Technical Manual
Section: 3-3-2 (hot-water branch)
Equations: 3.7, 3.8a, 3.8b, 3.9, 3.10
"""


DEFAULT_EHW_MAP = {
    "electric_storage": 1.56,
    "fuel_oil_boiler": 0.98,
    "natural_gas_boiler": 0.75,
    "heat_pump_storage": 0.5,
}


def _to_float(v, name: str) -> float:
    try:
        return float(v)
    except Exception:
        raise ValueError(f"{name} must be numeric")

def _find_hwi(table: dict, category: str) -> float:
    rows = table.get("rows", []) if isinstance(table, dict) else []
    for r in rows:
        if str(r.get("building_category", "")).strip().lower() == category.lower() and r.get("hwi_value") is not None:
            return float(r["hwi_value"])
    raise ValueError(f"No HWi default found for category={category}")


def _constants(table: dict) -> dict:
    c = (table or {}).get("derived_constants_for_engine", {}) if isinstance(table, dict) else {}
    return {
        "hpc_a_group_kw_per_m3": float(c.get("hpc_a_group_kw_per_m3", 2.08)),
        "hpc_fitness_shower_kw_per_m3": float(c.get("hpc_fitness_shower_kw_per_m3", 2.08)),
        "hpc_fitness_pool_spa_kw_per_m3": float(c.get("hpc_fitness_pool_spa_kw_per_m3", 1.2)),
        "hot_water_operation_hours_design": float(c.get("hot_water_operation_hours_design", 8.0)),
        "hp_eui_load_factor": float(c.get("hp_eui_load_factor", 0.7)),
    }


def calculate_hotwater_preprocess(
    category: str,
    afe: float,
    hotwater_system_type: str,
    table_3_3: dict,
    trace=None,
    hwi_override: float = None,
    npi: float = None,
    afw: float = None,
    oh: float = None,
    vp: float = None,
    vs: float = None,
    ehw_override: float = None,
):
    """
    Compute hot-water branch preprocess outputs:
      - HPC / HPC1 / HPC2 (as applicable)
      - HpEUI (Eq. 3.10)
      - EHW
    """
    if afe <= 0:
        raise ValueError("AFe must be positive")

    category = str(category or "").strip().lower()
    if not category:
        raise ValueError("category is required")

    c = _constants(table_3_3)

    # Eq. 3.7 / 3.8 / 3.9
    hpc = None
    hpc1 = None
    hpc2 = None

    if category in {"hotel", "long_term_care_or_hospital", "dormitory"}:
        # Eq. 3.7: HPC = 2.08 * (HWi * NPi)
        if npi is None:
            raise ValueError("NPi is required for hotel/long_term_care_or_hospital/dormitory")
        hwi = float(hwi_override) if hwi_override is not None else _find_hwi(table_3_3, category)
        hpc = c["hpc_a_group_kw_per_m3"] * (hwi * _to_float(npi, "NPi"))
        hpc_equation = "3.7"
    elif category == "fitness_leisure":
        # Eq. 3.8a / 3.8b then 3.9
        if afw is None or oh is None:
            raise ValueError("Afw and OH are required for fitness_leisure (HPC1)")
        if vp is None:
            vp = 0.0
        if vs is None:
            vs = 0.0
        afw = _to_float(afw, "Afw")
        oh = _to_float(oh, "OH")
        vp = _to_float(vp, "Vp")
        vs = _to_float(vs, "Vs")

        # Eq. 3.8a: HPC1 = 2.08 * (0.0135 * Afw * OH)
        hpc1 = c["hpc_fitness_shower_kw_per_m3"] * (0.0135 * afw * oh)
        # Eq. 3.8b: HPC2 = 1.2 * ((Vp+Vs)*0.01*OH)
        hpc2 = c["hpc_fitness_pool_spa_kw_per_m3"] * (((vp + vs) * 0.01) * oh)
        # Eq. 3.9
        hpc = hpc1 + hpc2
        hpc_equation = "3.8a/3.8b/3.9"
    else:
        raise ValueError("Unsupported hot-water category")

    # Eq. 3.10: HpEUI = (HPC * 8 * 365 * 0.7) / AFe
    hpeui = (hpc * c["hot_water_operation_hours_design"] * 365.0 * c["hp_eui_load_factor"]) / afe

    # EHW mapping (manual default, can override)
    if ehw_override is not None:
        ehw = _to_float(ehw_override, "ehw_override")
    else:
        key = str(hotwater_system_type or "").strip().lower()
        if key not in DEFAULT_EHW_MAP:
            raise ValueError(
                "hotwater_system_type must be one of: " + ", ".join(DEFAULT_EHW_MAP.keys())
            )
        ehw = DEFAULT_EHW_MAP[key]

    outputs = {
        "category": category,
        "HPC": hpc,
        "HPC1": hpc1,
        "HPC2": hpc2,
        "HpEUI": hpeui,
        "EHW": ehw,
        "hpc_equation": hpc_equation,
        "hpeui_equation": "3.10",
    }

    if trace:
        trace.add_step(
            description="Calculate hot-water preprocess (Eqs. 3.7/3.8/3.9/3.10)",
            inputs={
                "equation": ["3.7", "3.8a", "3.8b", "3.9", "3.10"],
                "category": category,
                "AFe": afe,
                "hotwater_system_type": hotwater_system_type,
                "NPi": npi,
                "Afw": afw,
                "OH": oh,
                "Vp": vp,
                "Vs": vs,
                "constants": c,
            },
            result=outputs,
        )

    return outputs
