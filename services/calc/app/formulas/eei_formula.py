"""
BERSn Technical Manual
Section: Chapter 3 (EEI definition)

EEI = E_design / E_baseline
"""

def calculate_eei(e_design: float, e_baseline: float, trace=None):

    if e_baseline <= 0:
        raise ValueError("Baseline energy must be greater than zero")

    eei = e_design / e_baseline

    if trace:
        trace.add_step(
            description="EEI Calculation",
            inputs={
                "E_design": e_design,
                "E_baseline": e_baseline,
                "equation": "EEI = E_design / E_baseline"
            },
            result=eei
        )

    return eei
