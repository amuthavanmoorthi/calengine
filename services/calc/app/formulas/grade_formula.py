"""
BERSn Technical Manual
Section: 3-7 (Table 3.4)

Grade mapping (1+ to 7) from SCOREEE and EUI* threshold scale.
"""


def _compute_eui_thresholds(eui_n: float, eui_g: float, eui_max: float):
    """
    Compute Table 3.4 EUI threshold values used for grade display/judgement.
    """
    return {
        "1+": eui_n,
        "1": eui_n + (10.0 / 40.0) * (eui_g - eui_n),
        "2": eui_n + (20.0 / 40.0) * (eui_g - eui_n),
        "3": eui_n + (30.0 / 40.0) * (eui_g - eui_n),
        "4": eui_g,
        "5": eui_g + (10.0 / 50.0) * (eui_max - eui_g),
        "6": eui_g + (30.0 / 50.0) * (eui_max - eui_g),
    }


def _grade_from_score(score_eee: float):
    """
    Score-based grade mapping per Section 3-7 score bands.
    """
    # Round to nearest integer for displayed score (manual note in 3-7).
    score_display = int(round(score_eee))

    if score_display >= 90:
        return "1+", score_display
    if score_display >= 80:
        return "1", score_display
    if score_display >= 70:
        return "2", score_display
    if score_display >= 60:
        return "3", score_display
    if score_display >= 50:
        return "4", score_display
    if score_display >= 40:
        return "5", score_display
    if score_display >= 20:
        return "6", score_display
    return "7", score_display


def calculate_grade(score_eee: float, eui_star: float, eui_n: float, eui_g: float, eui_max: float, trace=None):
    """
    Determine BERSn grade.

    For compliance with Section 3-7 implementation practice:
      - Primary grade judgement uses SCOREEE bands (1+..7).
      - EUI threshold judgement is also computed and returned for transparency.
    """
    thresholds = _compute_eui_thresholds(eui_n, eui_g, eui_max)
    grade_by_score, score_display = _grade_from_score(score_eee)

    # Derive EUI-based grade for consistency/audit.
    if eui_star <= thresholds["1+"]:
        grade_by_eui = "1+"
    elif eui_star <= thresholds["1"]:
        grade_by_eui = "1"
    elif eui_star <= thresholds["2"]:
        grade_by_eui = "2"
    elif eui_star <= thresholds["3"]:
        grade_by_eui = "3"
    elif eui_star <= thresholds["4"]:
        grade_by_eui = "4"
    elif eui_star <= thresholds["5"]:
        grade_by_eui = "5"
    elif eui_star <= thresholds["6"]:
        grade_by_eui = "6"
    else:
        grade_by_eui = "7"

    outputs = {
        "grade": grade_by_score,
        "score_display": score_display,
        "grade_by_score": grade_by_score,
        "grade_by_eui": grade_by_eui,
        "eui_thresholds": thresholds,
        "is_grade_consistent": grade_by_score == grade_by_eui,
    }

    if trace:
        trace.add_step(
            description="Calculate grade mapping (Section 3-7 / Table 3.4)",
            inputs={
                "equation": "3-7",
                "SCOREEE": score_eee,
                "EUI_star": eui_star,
                "EUIn": eui_n,
                "EUIg": eui_g,
                "EUImax": eui_max,
            },
            result=outputs,
        )

    return outputs
