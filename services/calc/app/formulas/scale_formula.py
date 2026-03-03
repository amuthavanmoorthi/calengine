"""
BERSn Technical Manual
Section: 3-5
Equations: 3.17, 3.18, 3.19, 3.20

Scale values for BERSn scoring:
  - EUIn
  - EUIg
  - EUIm
  - EUImax
"""


def calculate_scale_values(aeui: float, leui: float, eeui: float, eteui: float, ur: float, hpeui: float = 0.0, trace=None):
    """
    Compute BERSn scale values (Eq. 3.17~3.20).

    Args:
        aeui: Air-conditioning baseline EUI (Appendix 1 Table A).
        leui: Lighting baseline EUI (Appendix 1 Table A).
        eeui: Equipment baseline EUI (Appendix 1 Table A).
        eteui: Elevator baseline EUI (Eq. 3.2).
        ur: Urban/rural coefficient from Appendix 1 Table A.
        hpeui: Hot-water baseline EUI (Eq. 3.10); use 0 for general/no-hot-water branch.
        trace: Optional TraceBuilder instance.
    """
    if ur <= 0:
        raise ValueError("UR must be positive")

    base_sum = aeui + leui + eteui + hpeui

    # Eq. 3.17
    euin = ur * (0.5 * base_sum + eeui)
    # Eq. 3.18
    euig = ur * (0.8 * base_sum + eeui)
    # Eq. 3.19
    euim = ur * (1.0 * base_sum + eeui)
    # Eq. 3.20
    euimax = ur * (2.0 * base_sum + eeui)

    outputs = {
        "EUIn": euin,
        "EUIg": euig,
        "EUIm": euim,
        "EUImax": euimax,
    }

    if trace:
        trace.add_step(
            description="Calculate scale values (Eqs. 3.17-3.20)",
            inputs={
                "equation": ["3.17", "3.18", "3.19", "3.20"],
                "AEUI": aeui,
                "LEUI": leui,
                "EEUI": eeui,
                "EtEUI": eteui,
                "HpEUI": hpeui,
                "UR": ur,
                "base_sum": base_sum,
            },
            result=outputs,
        )

    return outputs
