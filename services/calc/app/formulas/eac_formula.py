"""
BERSn Technical Manual
Appendix 2 - EAC formulas (practical implementation subset)

Implemented methods:
  - central_le_50 (Eq. 15): EAC = BW * (1 - EE * HT * INAC)
  - individual_residential (Eq. 16a style)
  - individual_non_residential (Eq. 16b style)
"""


def compute_bw(tor: float, hor: float = 0.0, fn: float = 1.0) -> float:
    """
    Compute super-large glazing correction BW.

    Rule:
      - if TOR < 0.5 => BW = 1.0
      - else BW = 1.0 + (TOR - 0.5) / 1.5 + HOR / FN
    """
    if fn <= 0:
        raise ValueError("FN must be positive")
    if tor < 0:
        raise ValueError("TOR cannot be negative")
    if tor < 0.5:
        return 1.0
    bw = 1.0 + (tor - 0.5) / 1.5 + (hor / fn)
    return max(1.0, bw)


def _grade_mix(ar1: float, ar2: float, ar3: float, ar4: float) -> float:
    """
    Energy-grade weighted saving coefficient used in Eq.16a/16b.
    """
    return 0.39 * ar1 + 0.29 * ar2 + 0.25 * ar3 + 0.12 * ar4


def calculate_eac(method: str, trace=None, **kwargs) -> dict:
    """
    Calculate EAC using selected method.

    Returns:
      { "EAC": float, "method": str, "BW": float, "equation": str }
    """
    method = (method or "").strip().lower()
    if not method:
        raise ValueError("method is required")

    # Common: allow either direct BW or TOR/HOR/FN-derived BW
    bw = kwargs.get("BW")
    if bw is None:
        tor = kwargs.get("TOR")
        if tor is not None:
            hor = float(kwargs.get("HOR", 0.0))
            fn = float(kwargs.get("FN", 1.0))
            bw = compute_bw(float(tor), hor=hor, fn=fn)
    if bw is not None:
        bw = float(bw)
        if bw <= 0:
            raise ValueError("BW must be positive")

    if method == "central_le_50":
        # Eq. 15
        ee = float(kwargs["EE"])
        ht = float(kwargs["HT"])
        inac = float(kwargs["INAC"])
        if bw is None:
            raise ValueError("BW or TOR is required for method=central_le_50")
        eac = bw * (1.0 - (ee * ht * inac))
        equation = "15"

    elif method == "individual_residential":
        # Eq. 16a style
        ar1 = float(kwargs.get("Ar1", 0.0))
        ar2 = float(kwargs.get("Ar2", 0.0))
        ar3 = float(kwargs.get("Ar3", 0.0))
        ar4 = float(kwargs.get("Ar4", 0.0))
        inac = float(kwargs["INAC"])
        if bw is None:
            raise ValueError("BW or TOR is required for method=individual_residential")
        mix = _grade_mix(ar1, ar2, ar3, ar4)
        eac = bw * (1.0 - mix * inac)
        equation = "16a"

    elif method == "individual_non_residential":
        # Eq. 16b
        ar1 = float(kwargs.get("Ar1", 0.0))
        ar2 = float(kwargs.get("Ar2", 0.0))
        ar3 = float(kwargs.get("Ar3", 0.0))
        ar4 = float(kwargs.get("Ar4", 0.0))
        inac = float(kwargs["INAC"])
        if bw is None:
            raise ValueError("BW or TOR is required for method=individual_non_residential")
        mix = _grade_mix(ar1, ar2, ar3, ar4)
        eac = 0.9 * bw * (1.0 - mix * inac)
        equation = "16b"

    else:
        raise ValueError(f"Unsupported EAC method: {method}")

    # Practical floor (commonly used in manual sections)
    if kwargs.get("enforce_min_0_4", True):
        eac = max(0.4, eac)

    result = {
        "EAC": eac,
        "method": method,
        "BW": bw,
        "equation": equation,
    }

    if trace:
        trace.add_step(
            description="Calculate EAC (Appendix 2)",
            inputs={"equation": equation, "method": method, **kwargs, "BW": bw},
            result=result,
        )

    return result
