"""
BERSn Technical Manual
Section: 3-6
Equations: 3.21a, 3.21b, 3.22, 3.23, 3.24

Compute:
  - EUI*
  - CEI*
  - TEUI
  - ESR
"""


def calculate_indicators(score_eee: float, eui_n: float, eui_g: float, eui_m: float, eui_max: float, beta1: float, cfn: float, trace=None):
    """
    Compute BERSn indicators from score + scale values.

    Args:
        score_eee: SCOREEE from Eq. 3.16a/3.16b.
        eui_n: EUIn from Eq. 3.17.
        eui_g: EUIg from Eq. 3.18.
        eui_m: EUIm from Eq. 3.19.
        eui_max: EUImax from Eq. 3.20.
        beta1: Electricity carbon factor (kgCO2/kWh).
        cfn: Non-assessed equipment correction factor (dimensionless).
    """
    if cfn <= 0:
        raise ValueError("CFn must be positive")
    if eui_m == 0:
        raise ValueError("EUIm cannot be zero for ESR calculation")

    # Eq. 3.21a / 3.21b
    if score_eee > 50:
        eui_star = eui_g - (score_eee - 50) * (eui_g - eui_n) / 40.0
        eui_star_eq = "3.21a"
    else:
        eui_star = eui_g + (50 - score_eee) * (eui_max - eui_g) / 50.0
        eui_star_eq = "3.21b"

    # Eq. 3.22
    cei_star = eui_star * beta1
    # Eq. 3.23
    teui = eui_star / cfn
    # Eq. 3.24
    esr = (eui_m - eui_star) / eui_m

    outputs = {
        "EUI_star": eui_star,
        "CEI_star": cei_star,
        "TEUI": teui,
        "ESR": esr,
        "EUI_star_equation": eui_star_eq,
    }

    if trace:
        trace.add_step(
            description="Calculate indicators (Eqs. 3.21a/3.21b, 3.22, 3.23, 3.24)",
            inputs={
                "equation": [eui_star_eq, "3.22", "3.23", "3.24"],
                "SCOREEE": score_eee,
                "EUIn": eui_n,
                "EUIg": eui_g,
                "EUIm": eui_m,
                "EUImax": eui_max,
                "beta1": beta1,
                "CFn": cfn,
            },
            result=outputs,
        )

    return outputs
