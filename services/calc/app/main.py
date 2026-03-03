"""
FastAPI entry point for the BERSn calculation engine.

This module defines the request and response models and implements the
`/calc/bersn/run` endpoint.  The endpoint supports both the full
BERSn calculation using the formulas specified in Chapter 3 of the
technical manual and a fallback mode that simply
computes EEI as the ratio of design to baseline energy use.  Each
calculation step is recorded in a TraceBuilder for auditing.
"""

import logging
import time
from uuid import uuid4
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Import the score and formula helpers
from app.formulas.score_formula import calculate_score

# Import individual formula helpers from separate modules for better traceability
from app.formulas.afe_formula import calculate_afe, calculate_afe_from_excluded_zones
from app.formulas.eteui_formula import calculate_eteui
from app.formulas.weights_formula import calculate_weights
from app.formulas.weights_hotwater_formula import calculate_weights_hotwater
from app.formulas.eei_formula_bersn import calculate_eei_bersn
from app.formulas.eei_formula_hotwater import calculate_eei_hotwater
from app.formulas.scale_formula import calculate_scale_values
from app.formulas.indicators_formula import calculate_indicators
from app.formulas.grade_formula import calculate_grade
from app.formulas.eac_formula import calculate_eac
from app.formulas.el_formula import calculate_el, aggregate_el_totals
from app.formulas.hotwater_formula import calculate_hotwater_preprocess
from app.formulas.renewable_formula import compute_renewable_preprocess, apply_renewable_bonus
from app.formulas.nzb_formula import check_nzb_grade_gate, compute_nzb_balance

# Keep the simple EEI ratio function for compatibility
from app.formulas.eei_formula import calculate_eei as calculate_eei_ratio
from app.utils.trace_builder import TraceBuilder

# For 3rd formula
from app.utils.table_loader import load_json_table, TableLoadError
from app.utils.lookup_normalizer import normalize_building_lookup

# and for weights:
from app.formulas.weights_analysis import calculate_weights_Analysis

app = FastAPI(title="BERSn Calculation Engine")
logger = logging.getLogger(__name__)


def _build_error_payload(
    *,
    error_code: str,
    message: str,
    details: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Unified error payload for all calc endpoints.
    This keeps API consumers stable and simplifies frontend error handling.
    """
    payload: Dict[str, Any] = {
        "ok": False,
        "error_code": error_code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return payload


def _request_id_from_request(request: Request) -> str:
    """Read request id set by middleware; fallback if not available."""
    state_id = getattr(request.state, "request_id", None)
    return str(state_id) if state_id else "unknown"


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """
    Add request-id propagation and structured timing logs for observability.
    """
    request_id = request.headers.get("x-request-id") or str(uuid4())
    request.state.request_id = request_id
    started = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - started) * 1000.0
    response.headers["x-request-id"] = request_id
    logger.info(
        "calc_request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    )
    return response


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Liveness endpoint for container/orchestrator checks."""
    return {"ok": True, "status": "ok", "service": "bersn-calc"}


@app.get("/ready")
async def ready() -> Dict[str, Any]:
    """
    Readiness endpoint.
    For calc service this means process is up and required modules loaded.
    """
    return {"ok": True, "status": "ready", "service": "bersn-calc"}


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Normalize FastAPI/Pydantic request-shape validation errors.
    Example: missing body fields, wrong primitive types.
    """
    normalized_errors = []
    for err in exc.errors():
        location = [
            str(item)
            for item in err.get("loc", [])
            if str(item) not in {"body", "query", "path", "header", "cookie"}
        ]
        normalized_errors.append(
            {
                "field": ".".join(location) if location else None,
                "message": err.get("msg", "Invalid request"),
                "type": err.get("type", "validation_error"),
            }
        )

    return JSONResponse(
        status_code=422,
        content=_build_error_payload(
            error_code="BERSN_REQUEST_VALIDATION_ERROR",
            message="Request validation failed.",
            details={
                "request_id": _request_id_from_request(request),
                "errors": normalized_errors,
            },
        ),
        headers={"x-request-id": _request_id_from_request(request)},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Normalize explicit HTTPException responses raised from formula logic.
    """
    detail = exc.detail
    message = detail if isinstance(detail, str) else "Request failed."
    details = None if isinstance(detail, str) else detail

    if exc.status_code == 422:
        error_code = "BERSN_INPUT_VALIDATION_ERROR"
    elif exc.status_code == 404:
        error_code = "BERSN_NOT_FOUND"
    else:
        error_code = "BERSN_HTTP_ERROR"

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_payload(
            error_code=error_code,
            message=message,
            details={
                "request_id": _request_id_from_request(request),
                "errors": details,
            } if details is not None else {"request_id": _request_id_from_request(request)},
        ),
        headers={"x-request-id": _request_id_from_request(request)},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all hardening for unexpected server errors.
    Do not leak internal stack traces to clients.
    """
    logger.exception("Unhandled calc engine exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content=_build_error_payload(
            error_code="BERSN_INTERNAL_ERROR",
            message="Internal server error.",
            details={"request_id": _request_id_from_request(request)},
        ),
        headers={"x-request-id": _request_id_from_request(request)},
    )

class CalcRequest(BaseModel):
    """Pydantic model for calculation requests."""
    calc_run_id: str = Field(..., description="ID from API layer to correlate logs/results")
    branch_type: str = Field(
        ..., description="BERSn branch type (e.g., WITH_HOT_WATER or WITHOUT_HOT_WATER)"
    )
    formula_version: str = Field(..., description="Formula version tag for audit/traceability")
    inputs: Dict[str, Any] = Field(default_factory=dict)


class CalcResponse(BaseModel):
    """Pydantic model for calculation responses."""
    ok: bool = True
    calc_run_id: str
    branch_type: str
    formula_version: str
    score: float
    grade: str
    outputs: Dict[str, Any]
    trace: Any


def _to_float(value: Any, field_name: str) -> float:
    """Helper to convert a value to float with validation."""
    try:
        return float(value)
    except Exception:
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be a number")


def _require_fields(inputs: Dict[str, Any], fields: list[str]) -> None:
    """Raise one consistent 422 when one or more required input fields are missing."""
    missing = [field for field in fields if inputs.get(field) is None]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required inputs: {', '.join(missing)}",
        )


def _require_object(value: Any, field_name: str) -> Dict[str, Any]:
    """Validate object shape consistently for formula endpoints."""
    if not isinstance(value, dict):
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be an object")
    return value


def _require_positive(value: Any, field_name: str) -> float:
    """Convert to float and enforce > 0."""
    numeric = _to_float(value, field_name)
    if numeric <= 0:
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be > 0")
    return numeric


def _require_non_negative(value: Any, field_name: str) -> float:
    """Convert to float and enforce >= 0."""
    numeric = _to_float(value, field_name)
    if numeric < 0:
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be >= 0")
    return numeric


def _require_list(value: Any, field_name: str) -> list:
    """Validate list shape consistently for formula endpoints."""
    if not isinstance(value, list):
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be an array")
    return value


def _require_non_empty_string(value: Any, field_name: str) -> str:
    """Validate required non-empty string fields."""
    if value is None:
        raise HTTPException(status_code=422, detail=f"'{field_name}' is required")
    text = str(value).strip()
    if not text:
        raise HTTPException(status_code=422, detail=f"'{field_name}' must be a non-empty string")
    return text


def _require_one_of(value: Any, field_name: str, allowed: set[str]) -> str:
    """Validate enum-like string inputs."""
    text = _require_non_empty_string(value, field_name)
    if text not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"'{field_name}' must be one of: {', '.join(sorted(allowed))}",
        )
    return text


def _require_in_range(value: Any, field_name: str, min_value: float, max_value: float) -> float:
    """Validate numeric range inclusively."""
    numeric = _to_float(value, field_name)
    if numeric < min_value or numeric > max_value:
        raise HTTPException(
            status_code=422,
            detail=f"'{field_name}' must be between {min_value} and {max_value}",
        )
    return numeric


def _validate_formula_request_meta(request: "FormulaRequest") -> None:
    """Apply baseline request-level hardening to all formula endpoints."""
    _require_non_empty_string(request.calc_run_id, "calc_run_id")
    _require_one_of(request.formula_version, "formula_version", {"v1.0"})
    _require_object(request.inputs, "inputs")


def _validate_optional_excluded_zones_shape(excluded_zones: Any) -> None:
    """Validate excluded_zones item shape when caller uses 3-2-1 structured input."""
    if excluded_zones is None:
        return
    zones = _require_list(excluded_zones, "excluded_zones")
    for idx, zone in enumerate(zones):
        row = _require_object(zone, f"excluded_zones[{idx}]")
        _require_non_empty_string(row.get("type"), f"excluded_zones[{idx}].type")
        _require_non_negative(row.get("area_m2"), f"excluded_zones[{idx}].area_m2")


def _validate_weights_sum(*weights: float) -> None:
    """
    Ensure normalized coefficient set is coherent.
    Formula rounding can introduce tiny errors, so use tolerance.
    """
    total = sum(weights)
    if abs(total - 1.0) > 1e-4:
        raise HTTPException(
            status_code=422,
            detail=f"weights must sum to 1.0 (±1e-4), got {total}",
        )


def _validate_elevators(elevators: list) -> None:
    """Validate elevator rows for Eq. 3.2 with consistent field-level messages."""
    for idx, elevator in enumerate(elevators):
        if not isinstance(elevator, dict):
            raise HTTPException(status_code=422, detail=f"'elevators[{idx}]' must be an object")
        for key in ("Nej", "Eelj", "YOHj"):
            if elevator.get(key) is None:
                raise HTTPException(status_code=422, detail=f"Missing elevators[{idx}].{key}")
            _require_non_negative(elevator.get(key), f"elevators[{idx}].{key}")


@app.post("/calc/bersn/run", response_model=CalcResponse)
def run_calc(request: CalcRequest):
    """
    Perform a BERSn calculation based on the provided inputs.

    There are two supported modes:

    1. **Comprehensive BERSn mode** – When the input includes the
       evaluation area and other subsystem parameters (e.g. ``AF``,
       ``exempt_areas``, ``elevators``, ``AEUI``, ``LEUI``, ``EAC``,
       ``EEV``, ``Es``, ``EL`` and ``Et``), the calculation follows
       the formulas specified in Chapter 3 of the BERSn manual.  If
       ``branch_type`` is ``WITH_HOT_WATER``, the hot-water weights and
       additional term are also considered (Eq. 3.15).

    2. **Fallback ratio mode** – If the comprehensive parameters are
       missing but ``E_design`` and ``E_baseline`` are provided, the
       EEI is computed as the ratio of design to baseline energy, as in
       the earlier skeleton implementation.

    The function records each calculation step in a ``TraceBuilder`` to
    ensure traceability.
    """
    trace = TraceBuilder()
    inputs = request.inputs

    # Prepare an outputs dictionary to collect intermediate results.
    outputs: Dict[str, Any] = {}

    # If the comprehensive inputs are provided, perform the full BERSn calculation.
    if "AF" in inputs:
        # Extract required parameters with validation.
        af = _to_float(inputs.get("AF"), "AF")
        exempt_areas = [float(x) for x in inputs.get("exempt_areas", [])]
        excluded_zones = inputs.get("excluded_zones")
        elevators = inputs.get("elevators", [])
        aeui = _to_float(inputs.get("AEUI"), "AEUI")
        leui = _to_float(inputs.get("LEUI"), "LEUI")
        eac = _to_float(inputs.get("EAC"), "EAC")
        eev = _to_float(inputs.get("EEV"), "EEV")
        es = _to_float(inputs.get("Es"), "Es")
        el = _to_float(inputs.get("EL"), "EL")
        et = _to_float(inputs.get("Et"), "Et")

        # Step 1: compute evaluation floor area (Eq. 3.1).
        if isinstance(excluded_zones, list):
            afe, exclusion_result = calculate_afe_from_excluded_zones(af, excluded_zones, trace)
            outputs["AFk_total_m2"] = exclusion_result["afk_total_m2"]
            outputs["excluded_zone_evaluation"] = exclusion_result["evaluated_zones"]
        else:
            afe = calculate_afe(af, exempt_areas, trace)
            outputs["AFk_total_m2"] = sum(exempt_areas)
        outputs["AFe"] = afe

        # Step 2: compute elevator EUI baseline (Eq. 3.2).
        eteui = calculate_eteui(elevators, afe, trace)
        outputs["EtEUI"] = eteui

        # Step 3: compute weights and EEI depending on branch type.
        if request.branch_type == "WITH_HOT_WATER":
            # Hot-water case: additional inputs for hot water.
            hpeui = _to_float(inputs.get("HpEUI"), "HpEUI")
            ehw = _to_float(inputs.get("EHW"), "EHW")
            weights = calculate_weights_hotwater(aeui, leui, eteui, hpeui, trace)
            outputs["weights"] = weights
            a = weights["a"]
            b = weights["b"]
            c = weights["c"]
            d = weights["d"]
            # EEI with hot water (Eq. 3.15).
            eei = calculate_eei_hotwater(a, b, c, d, eac, eev, es, el, et, ehw, trace)
            outputs["HpEUI"] = hpeui
            outputs["EHW"] = ehw
        else:
            # Non-hot-water case: compute weights and EEI (Eqs. 3.3–3.6).
            weights = calculate_weights(aeui, leui, eteui, trace)
            outputs["weights"] = weights
            a = weights["a"]
            b = weights["b"]
            c = weights["c"]
            eei = calculate_eei_bersn(a, b, c, eac, eev, es, el, et, trace)

        outputs["EEI"] = eei
        # Compute score via Eq. 3.16a/3.16b.
        score = calculate_score(eei, trace)
        outputs["score"] = score
        # Placeholder grade: real implementation should map score to levels.
        grade = "Level-1" if score >= 80 else "Below"
        return CalcResponse(
            calc_run_id=request.calc_run_id,
            branch_type=request.branch_type,
            formula_version=request.formula_version,
            score=score,
            grade=grade,
            outputs=outputs,
            trace=trace.build(),
        )

    # Fallback ratio mode when comprehensive inputs are absent.
    eei: Optional[float] = None
    if "EEI" in inputs and inputs["EEI"] is not None:
        # Use the provided EEI directly.
        eei = _to_float(inputs["EEI"], "EEI")
        trace.add_step(
            description="EEI provided by caller", inputs={"EEI": eei}, result=eei
        )
    else:
        # Require design and baseline energies for ratio calculation.
        if "E_design" not in inputs:
            raise HTTPException(status_code=422, detail="Missing required input: E_design")
        if "E_baseline" not in inputs:
            raise HTTPException(status_code=422, detail="Missing required input: E_baseline")
        e_design = _to_float(inputs["E_design"], "E_design")
        e_baseline = _to_float(inputs["E_baseline"], "E_baseline")
        eei = calculate_eei_ratio(e_design, e_baseline, trace)

    # Compute score and grade in ratio mode.
    score = calculate_score(eei, trace)
    grade = "Level-1" if score >= 80 else "Below"
    outputs["EEI"] = eei
    if "E_design" in inputs:
        outputs["E_design"] = inputs["E_design"]
    if "E_baseline" in inputs:
        outputs["E_baseline"] = inputs["E_baseline"]

    return CalcResponse(
        calc_run_id=request.calc_run_id,
        branch_type=request.branch_type,
        formula_version=request.formula_version,
        score=score,
        grade=grade,
        outputs=outputs,
        trace=trace.build(),
    )


# For the AFE formula - 1

class FormulaRequest(BaseModel):
    calc_run_id: str
    formula_version: str
    inputs: Dict[str, Any] = Field(default_factory=dict)

class FormulaResponse(BaseModel):
    ok: bool = True
    calc_run_id: str
    formula_version: str
    outputs: Dict[str, Any]
    trace: Any

@app.post("/calc/bersn/formulas/afe", response_model=FormulaResponse)
def run_afe(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)

    inputs = request.inputs

    if "AF" not in inputs:
        raise HTTPException(status_code=422, detail="Missing required inputs: AF")
    if "exempt_areas" not in inputs and "excluded_zones" not in inputs:
        raise HTTPException(status_code=422, detail="Missing required inputs: exempt_areas or excluded_zones")

    af = _require_positive(inputs.get("AF"), "AF")
    exempt_areas = [float(x) for x in inputs.get("exempt_areas", [])]
    excluded_zones = inputs.get("excluded_zones")
    for idx, area in enumerate(exempt_areas):
        if area < 0:
            raise HTTPException(status_code=422, detail=f"'exempt_areas[{idx}]' must be >= 0")
    _validate_optional_excluded_zones_shape(excluded_zones)

    if isinstance(excluded_zones, list):
        afe, exclusion_result = calculate_afe_from_excluded_zones(af, excluded_zones, trace)
        outputs = {
            "AFe": afe,
            "AFk_total_m2": exclusion_result["afk_total_m2"],
            "excluded_zone_evaluation": exclusion_result["evaluated_zones"],
        }
    else:
        afe = calculate_afe(af, exempt_areas, trace)
        outputs = {
            "AFe": afe,
            "AFk_total_m2": sum(exempt_areas),
        }

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# For te ETEUI Formula -2
@app.post("/calc/bersn/formulas/eteui", response_model=FormulaResponse)
def run_eteui(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs

    _require_fields(inputs, ["elevators", "AFe"])

    elevators = _require_list(inputs.get("elevators", []), "elevators")
    _validate_elevators(elevators)
    afe = _require_positive(inputs.get("AFe"), "AFe")

    eteui = calculate_eteui(elevators, afe, trace)

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs={"EtEUI": eteui},
        trace=trace.build(),
    )


# For weights formula calculation -3
@app.post("/calc/bersn/formulas/weights", response_model=FormulaResponse)
def run_weights(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs

    # Required inputs for this step
    building_code = inputs.get("building_code")
    operation_mode = inputs.get("operation_mode")
    et_eui = inputs.get("EtEUI")

    building_code = _require_non_empty_string(building_code, "building_code")
    operation_mode = _require_one_of(
        operation_mode,
        "operation_mode",
        {"full_year_ac", "intermittent_ac"},
    )
    if et_eui is None:
        raise HTTPException(status_code=422, detail="Missing required inputs: EtEUI")

    et_eui = _require_non_negative(et_eui, "EtEUI")

    # Load Appendix-1 Table-A baseline data
    # Put your JSON in: app/data/v1.0/baseline_eui_tableA_v1.0_A1_O6_full.json
    try:
        table = load_json_table("baseline_eui_tableA_v1.0_A1_O6_full.json", version=request.formula_version)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        outputs = calculate_weights_Analysis(
            building_code=building_code,
            operation_mode=operation_mode,
            et_eui=et_eui,
            baseline_table=table,
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )



# --- helpers for EEV  ---

def _norm_upper(s: Any) -> Optional[str]:
    if s is None:
        return None
    if not isinstance(s, str):
        s = str(s)
    s = s.strip()
    return s.upper() if s else None


def _in_range(value: Optional[float], min_v: Optional[float], max_v: Optional[float],
              min_exclusive: bool = False, max_inclusive: bool = True) -> bool:
    if value is None:
        return False
    if min_v is not None:
        if min_exclusive:
            if not (value > float(min_v)):
                return False
        else:
            if not (value >= float(min_v)):
                return False
    if max_v is not None:
        if max_inclusive:
            if not (value <= float(max_v)):
                return False
        else:
            if not (value < float(max_v)):
                return False
    return True


def _eval_spec(spec: Any, x: Optional[float] = None) -> float:
    """
    spec examples from your JSON:
      { "type": "const", "value": 110, "operator": "<=", "unit": "kWh/m2.yr" }
      { "type": "poly2", "var": "X", "a": 146.2, "b": -414.9, "c": 276, ... }
    """
    if spec is None:
        raise ValueError("EVc/EVmin spec is null")
    if isinstance(spec, (int, float)):
        return float(spec)
    if not isinstance(spec, dict):
        raise ValueError(f"EVc/EVmin spec must be number or object, got {type(spec)}")

    t = spec.get("type", "const")
    if t == "const":
        return float(spec["value"])
    if t == "poly2":
        if x is None:
            raise ValueError("poly2 requires X but X is missing")
        a = float(spec.get("a", 0.0))
        b = float(spec.get("b", 0.0))
        c = float(spec.get("c", 0.0))
        return a * (x ** 2) + b * x + c

    raise ValueError(f"Unknown EV spec type: {t}")


# --- For 3 to ??? ---
@app.post("/calc/bersn/formulas/eev", response_model=FormulaResponse)
def run_eev(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    # Required inputs for selecting the row
    ev_scheme = _norm_upper(inputs.get("ev_scheme"))
    ev_indicator = _norm_upper(inputs.get("ev_indicator"))
    if not ev_scheme:
        raise HTTPException(status_code=422, detail="Missing inputs.ev_scheme")
    if not ev_indicator:
        raise HTTPException(status_code=422, detail="Missing inputs.ev_indicator")

    # Raw EV metric to normalize (caller provides it for now)
    if inputs.get("EV") is None:
        raise HTTPException(status_code=422, detail="Missing inputs.EV (required to compute EEV)")
    ev = _to_float(inputs.get("EV"), "EV")

    # Normalize building lookup (do NOT pass require_ur=False unless your function supports it)
    building = _require_object(inputs.get("building") or {}, "inputs.building")
    b = normalize_building_lookup(building, require_ur=False)

    # Pull optional dimensions used by table filters
    altitude_m = None
    if isinstance(building, dict) and building.get("altitude_m") is not None:
        altitude_m = float(building.get("altitude_m"))

    climate_region = _norm_upper(
        inputs.get("climate_region")  # allow override
        or (building.get("climate_zone") if isinstance(building, dict) else None)
        or b.get("climate_zone")
    )

    # building_group is not always derivable; allow user to pass explicitly
    inferred_group = None
    if ev_scheme == "TOTAL_ENVLOAD":
        inferred_group = b.get("ev_building_group_default")
    else:
        inferred_group = b.get("accommodation_group") or b.get("ev_building_group_default")

    building_group = _norm_upper(
        inputs.get("building_group")
        or inputs.get("ev_table_group")
        or inferred_group
    )

    # Compute WWR if envelope areas are present.
    # Allow direct `wwr` override for callers that already computed it.
    wwr = None
    if inputs.get("wwr") is not None:
        wwr = _to_float(inputs.get("wwr"), "wwr")
    envelope = inputs.get("envelope") or {}
    if isinstance(envelope, dict):
        wa = envelope.get("wall_area")
        wina = envelope.get("window_area")
        if wa is not None and wina is not None:
            wa = float(wa)
            wina = float(wina)
            # Match project/test definition:
            # WWR = window_area / wall_area (not window/(wall+window)).
            if wa > 0:
                wwr = wina / wa

    # Load the versioned table (your JSON has keys: meta, schema_version, rows)
    try:
        table = load_json_table("envelope_evc_evmin.json", version=request.formula_version)
    except TableLoadError as e:
        raise HTTPException(status_code=422, detail=str(e))

    rows = table.get("rows")
    if not isinstance(rows, list):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid table format: expected top-level 'rows' array in envelope_evc_evmin.json, got keys={list(table.keys())}",
        )

    # Select the best matching row
    matched = None
    for r in rows:
        if not isinstance(r, dict):
            continue

        if _norm_upper(r.get("scheme")) != ev_scheme:
            continue
        if _norm_upper(r.get("indicator")) != ev_indicator:
            continue

        # altitude filter (only if row defines it)
        r_alt_min = r.get("altitude_min_m")
        r_alt_max = r.get("altitude_max_m")
        if r_alt_min is not None or r_alt_max is not None:
            if altitude_m is None:
                continue
            if not _in_range(
                altitude_m,
                r_alt_min,
                r_alt_max,
                min_exclusive=False,
                max_inclusive=False if r_alt_max is not None else True,
            ):
                continue

        # WWR filter (only if row defines it)
        r_wwr_min = r.get("wwr_min")
        r_wwr_max = r.get("wwr_max")
        if r_wwr_min is not None or r_wwr_max is not None:
            if wwr is None:
                continue
            if not _in_range(
                wwr,
                r_wwr_min,
                r_wwr_max,
                min_exclusive=bool(r.get("wwr_min_exclusive", False)),
                max_inclusive=bool(r.get("wwr_max_inclusive", True)),
            ):
                continue

        # climate_region filter (only if row defines it)
        r_cz = _norm_upper(r.get("climate_region"))
        if r_cz is not None:
            if climate_region is None:
                continue
            if climate_region != r_cz:
                continue

        # building_group filter (only if row defines it)
        r_bg = _norm_upper(r.get("building_group"))
        if r_bg is not None:
            if building_group is None:
                continue
            if building_group != r_bg:
                continue

        matched = r
        break

    if matched is None:
        # Helpful debug summary
        schemes = sorted({_norm_upper(x.get("scheme")) for x in rows if isinstance(x, dict) and x.get("scheme")})
        inds = sorted({_norm_upper(x.get("indicator")) for x in rows if isinstance(x, dict) and x.get("indicator")})
        raise HTTPException(
            status_code=422,
            detail=(
                "No matching EVc/EVmin row found for given filters. "
                f"scheme={ev_scheme}, indicator={ev_indicator}, altitude_m={altitude_m}, wwr={wwr}, "
                f"climate_region={climate_region}, building_group={building_group}. "
                f"Available schemes={schemes[:30]} indicators={inds[:30]}"
            ),
        )

    # Evaluate EVc/EVmin from the matched row
    try:
        # For poly2 rows, they use X. Use X = wwr by default (that matches your note: X = average facade window ratio).
        X = wwr
        evc = _eval_spec(matched.get("EVc"), x=X)
        evmin = _eval_spec(matched.get("EVmin"), x=X)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid EVc/EVmin spec in table row: {str(e)}")

    if evc == evmin:
        raise HTTPException(status_code=422, detail="Invalid table row: EVc == EVmin; cannot compute EEV")

    eev = (evc - ev) / (evc - evmin)
    if eev > 1.0:
        eev = 1.0

    trace.add_step(
        description="Compute EEV from EVc/EVmin table + normalize EV",
        inputs={
            "formula_version": request.formula_version,
            "table": "envelope_evc_evmin.json",
            "filters": {
                "scheme": ev_scheme,
                "indicator": ev_indicator,
                "altitude_m": altitude_m,
                "wwr": wwr,
                "climate_region": climate_region,
                "building_group": building_group,
            },
            "matched_row": {
                "manual_label": matched.get("manual_label"),
                "scheme": matched.get("scheme"),
                "indicator": matched.get("indicator"),
                "altitude_min_m": matched.get("altitude_min_m"),
                "altitude_max_m": matched.get("altitude_max_m"),
                "wwr_min": matched.get("wwr_min"),
                "wwr_max": matched.get("wwr_max"),
                "climate_region": matched.get("climate_region"),
                "building_group": matched.get("building_group"),
                "EVc": matched.get("EVc"),
                "EVmin": matched.get("EVmin"),
            },
            "EV": ev,
            "EVc_eval": evc,
            "EVmin_eval": evmin,
        },
        result=eev,
    )

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs={"EEV": eev},
        trace=trace.build(),
    )


# For 3-2-2 preprocessing (EEV / EAC / EL) - prepare efficiency inputs before EEI formulas.
@app.post("/calc/bersn/formulas/preprocess-efficiency", response_model=FormulaResponse)
def run_preprocess_efficiency(request: FormulaRequest):
    """
    BERSn 3-2-2 preprocessing endpoint.

    This endpoint returns a normalized set of efficiency inputs required by EEI formulas:
      - EEV (envelope efficiency)
      - EAC (air-conditioning efficiency)
      - EL  (lighting efficiency)

    Current behavior:
      - EEV: can be provided directly OR computed via the existing /formulas/eev input shape.
      - EAC: currently validated/pass-through (Appendix 2 EAC formula endpoint not yet implemented).
      - EL : currently validated/pass-through (Appendix 2 EL formula endpoint not yet implemented).
    """
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    # --- EEV preprocessing ---
    eev = None
    eev_source = None

    # Allow direct EEV input when caller already computed Appendix 2 externally.
    if inputs.get("EEV") is not None:
      eev = _require_non_negative(inputs.get("EEV"), "EEV")
      eev_source = "provided_directly"
      trace.add_step(
          description="Accept provided EEV (3-2-2 preprocessing)",
          inputs={"equation": "3-2-2", "EEV": inputs.get("EEV")},
          result=eev,
      )
    else:
      # Try to compute EEV from Appendix 2 parameters using the existing run_eev implementation.
      has_eev_calc_inputs = any(
          key in inputs for key in ["ev_scheme", "ev_indicator", "EV", "building", "envelope", "climate_region", "building_group"]
      )
      if has_eev_calc_inputs:
          eev_resp = run_eev(request)
          eev = eev_resp.outputs.get("EEV")
          eev_source = "computed_from_appendix2_eev"
          trace.add_step(
              description="Reuse /formulas/eev endpoint to compute EEV (3-2-2 preprocessing)",
              inputs={"equation": "3-2-2", "mode": "compute_from_inputs"},
              result=eev,
          )

    # --- EAC preprocessing ---
    # Prefer direct value; otherwise compute from Appendix-2 inputs when provided.
    eac = None
    eac_source = None
    if inputs.get("EAC") is not None:
        eac = _require_non_negative(inputs.get("EAC"), "EAC")
        eac_source = "provided_directly"
        trace.add_step(
            description="Accept provided EAC (3-2-2 preprocessing)",
            inputs={"equation": "3-2-2", "EAC": inputs.get("EAC")},
            result=eac,
        )
    else:
        if inputs.get("eac_method") is not None:
            eac_resp = run_eac_formula(request)
            eac = eac_resp.outputs.get("EAC")
            eac_source = "computed_from_appendix2_eac"
            trace.add_step(
                description="Reuse /formulas/eac endpoint to compute EAC (3-2-2 preprocessing)",
                inputs={"equation": "3-2-2", "mode": "compute_from_eac_inputs"},
                result=eac,
            )

    # --- EL preprocessing ---
    # Prefer direct value; otherwise compute from Appendix-2 Eq.17 inputs when provided.
    el = None
    el_source = None
    if inputs.get("EL") is not None:
        el = _require_non_negative(inputs.get("EL"), "EL")
        el_source = "provided_directly"
        trace.add_step(
            description="Accept provided EL (3-2-2 preprocessing)",
            inputs={"equation": "3-2-2", "EL": inputs.get("EL")},
            result=el,
        )
    else:
        if inputs.get("el_spaces") is not None or (
            inputs.get("el_numerator_total") is not None and inputs.get("el_denominator_total") is not None
        ):
            el_resp = run_el_formula(request)
            el = el_resp.outputs.get("EL")
            el_source = "computed_from_appendix2_el"
            trace.add_step(
                description="Reuse /formulas/el endpoint to compute EL (3-2-2 preprocessing)",
                inputs={"equation": "3-2-2", "mode": "compute_from_el_inputs"},
                result=el,
            )

    # All three are required before downstream EEI formulas can run.
    missing = []
    if eev is None:
        missing.append("EEV")
    if eac is None:
        missing.append("EAC")
    if el is None:
        missing.append("EL")
    if missing:
        raise HTTPException(
            status_code=422,
            detail=(
                "Missing required 3-2-2 efficiency inputs: "
                + ", ".join(missing)
                + ". "
                + "Provide EEV directly or with EEV Appendix 2 inputs; provide EAC and EL directly for now."
            ),
        )

    outputs = {
        "EEV": eev,
        "EAC": eac,
        "EL": el,
        "preprocess_sources": {
            "EEV": eev_source,
            "EAC": eac_source,
            "EL": el_source,
        },
    }

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Appendix 2 EAC formula endpoint
@app.post("/calc/bersn/formulas/eac", response_model=FormulaResponse)
def run_eac_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    if not inputs.get("eac_method"):
        raise HTTPException(status_code=422, detail="Missing eac_method")

    method = str(inputs.get("eac_method")).strip()
    kwargs = dict(inputs)
    kwargs.pop("eac_method", None)

    try:
        outputs = calculate_eac(method=method, trace=trace, **kwargs)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Appendix 2 EL formula endpoint
@app.post("/calc/bersn/formulas/el", response_model=FormulaResponse)
def run_el_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    numerator_total = inputs.get("el_numerator_total")
    denominator_total = inputs.get("el_denominator_total")

    # Option A: direct totals
    if numerator_total is not None and denominator_total is not None:
        numerator_total = _to_float(numerator_total, "el_numerator_total")
        denominator_total = _to_float(denominator_total, "el_denominator_total")
    else:
        # Option B: per-space rows
        spaces = inputs.get("el_spaces")
        if not isinstance(spaces, list) or len(spaces) == 0:
            raise HTTPException(
                status_code=422,
                detail="Provide either (el_numerator_total + el_denominator_total) or non-empty el_spaces",
            )
        try:
            totals = aggregate_el_totals(spaces)
            numerator_total = totals["numerator_total"]
            denominator_total = totals["denominator_total"]
            trace.add_step(
                description="Aggregate EL totals from spaces (Appendix 2 Eq. 17)",
                inputs={"equation": "17", "space_count": len(spaces)},
                result=totals,
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    try:
        outputs = calculate_el(
            numerator_total=numerator_total,
            denominator_total=denominator_total,
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Hot-water preprocess endpoint (3-3-2 Eq. 3.7~3.10)
@app.post("/calc/bersn/formulas/hotwater-preprocess", response_model=FormulaResponse)
def run_hotwater_preprocess_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    # Required
    if inputs.get("AFe") is None:
        raise HTTPException(status_code=422, detail="Missing required inputs: AFe")
    if not inputs.get("hotwater_category"):
        raise HTTPException(status_code=422, detail="Missing required inputs: hotwater_category")
    if not inputs.get("hotwater_system_type") and inputs.get("ehw_override") is None:
        raise HTTPException(status_code=422, detail="Missing required inputs: hotwater_system_type (or provide ehw_override)")

    try:
        table_3_3 = load_json_table("table_3_3_hotwater_defaults.json", version=request.formula_version)
    except TableLoadError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        outputs = calculate_hotwater_preprocess(
            category=inputs.get("hotwater_category"),
            afe=_require_positive(inputs.get("AFe"), "AFe"),
            hotwater_system_type=inputs.get("hotwater_system_type"),
            table_3_3=table_3_3,
            trace=trace,
            hwi_override=inputs.get("hwi_override"),
            npi=inputs.get("NPi"),
            afw=inputs.get("Afw"),
            oh=inputs.get("OH"),
            vp=inputs.get("Vp"),
            vs=inputs.get("Vs"),
            ehw_override=inputs.get("ehw_override"),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Section 3-8 Table 3.5 preprocess (GE, PV-equivalent area, Rs)
@app.post("/calc/bersn/formulas/renewable-preprocess", response_model=FormulaResponse)
def run_renewable_preprocess_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    try:
        table_3_5 = load_json_table("renewable_bonus_table_3_5.json", version=request.formula_version)
    except TableLoadError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        outputs = compute_renewable_preprocess(inputs=inputs, table_3_5=table_3_5, trace=trace)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Section 3-8 bonus apply (Eq. 3.25/3.26 or Eq. 3.27 + 1.1x cap)
@app.post("/calc/bersn/formulas/renewable-bonus", response_model=FormulaResponse)
def run_renewable_bonus_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = dict(request.inputs or {})

    # For generation method, derive SCOREEE_after_raw from EEI_after via Section 3-4 curve.
    method = str(inputs.get("method", "")).strip().lower()
    if method and method not in ("pv_area_method", "generation_method"):
        raise HTTPException(status_code=422, detail="method must be 'pv_area_method' or 'generation_method'")
    if method == "generation_method":
        required = ["EEI_before", "EUI_star", "AFe", "GE", "SCOREEE_before"]
        for field in required:
            if inputs.get(field) is None:
                raise HTTPException(status_code=422, detail=f"Missing {field}")

        # Build temporary EEI_after using Eq. 3.27 first.
        try:
            eei_before = float(inputs.get("EEI_before"))
            eui_star = float(inputs.get("EUI_star"))
            afe = float(inputs.get("AFe"))
            ge = float(inputs.get("GE"))
        except Exception:
            raise HTTPException(status_code=422, detail="EEI_before/EUI_star/AFe/GE must be numeric")

        if eui_star <= 0 or afe <= 0:
            raise HTTPException(status_code=422, detail="EUI_star and AFe must be > 0")

        eei_after = eei_before * ((eui_star * afe - ge) / (afe * eui_star))
        if eei_after < 0:
            eei_after = 0.0

        # Reuse score equation (3.16a/3.16b) for raw post-renewable score.
        score_after_raw = calculate_score(eei_after, trace)
        inputs["SCOREEE_after_raw"] = score_after_raw
        inputs["EEI_after"] = eei_after

    try:
        outputs = apply_renewable_bonus(inputs=inputs, trace=trace)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Section 3-9 NZB: grade eligibility gate
@app.post("/calc/bersn/formulas/nzb-eligibility", response_model=FormulaResponse)
def run_nzb_eligibility_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    if inputs.get("grade") is None:
        raise HTTPException(status_code=422, detail="Missing required inputs: grade")

    try:
        outputs = check_nzb_grade_gate(inputs.get("grade"), trace=trace)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Section 3-9 NZB: TE/TGE balance
@app.post("/calc/bersn/formulas/nzb-balance", response_model=FormulaResponse)
def run_nzb_balance_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    _require_fields(inputs, ["TEUI", "AFe", "TGE"])

    try:
        outputs = compute_nzb_balance(
            teui=inputs.get("TEUI"),
            afe=inputs.get("AFe"),
            tge=inputs.get("TGE"),
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# Section 3-9 NZB: one-shot final decision
@app.post("/calc/bersn/formulas/nzb-evaluate", response_model=FormulaResponse)
def run_nzb_evaluate_formula(request: FormulaRequest):
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    _require_fields(inputs, ["grade", "TEUI", "AFe", "TGE"])

    try:
        gate = check_nzb_grade_gate(inputs.get("grade"), trace=trace)
        balance = compute_nzb_balance(
            teui=inputs.get("TEUI"),
            afe=inputs.get("AFe"),
            tge=inputs.get("TGE"),
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    is_nzb_pass = bool(gate["is_grade_eligible"] and balance["is_balance_pass"])
    outputs = {
        "grade_gate": gate,
        "balance_check": balance,
        "is_nzb_pass": is_nzb_pass,
        "section": "3-9",
        "reason": "Passes grade gate and TE/TGE balance." if is_nzb_pass else "Failed grade gate or TE/TGE balance.",
    }

    trace.add_step(
        description="Finalize NZB result (Section 3-9)",
        inputs={"equation": "3-9-final", "grade_gate": gate["is_grade_eligible"], "balance_pass": balance["is_balance_pass"]},
        result={"is_nzb_pass": is_nzb_pass},
    )

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# For 3-3-1 general non-residential EEI path (Eq. 3.1 ~ 3.6 in one endpoint)
@app.post("/calc/bersn/formulas/general-eei", response_model=FormulaResponse)
def run_general_eei_path(request: FormulaRequest):
    """
    Compute the core BERSn general branch path (no central hot water):
      Eq. 3.1 AFe
      Eq. 3.2 EtEUI
      Eq. 3.3~3.5 weights a,b,c
      Eq. 3.6 EEI

    This endpoint is a formula pipeline endpoint for development/testing and returns
    all intermediate values needed for debugging and acceptance checks.
    """
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    # --- Validate and read required inputs ---
    _require_fields(inputs, ["AF", "elevators", "AEUI", "LEUI", "EAC", "EEV", "Es", "EL", "Et"])

    af = _require_positive(inputs.get("AF"), "AF")
    elevators = _require_list(inputs.get("elevators", []), "elevators")
    _validate_elevators(elevators)

    aeui = _require_non_negative(inputs.get("AEUI"), "AEUI")
    leui = _require_non_negative(inputs.get("LEUI"), "LEUI")
    eac = _require_non_negative(inputs.get("EAC"), "EAC")
    eev = _require_non_negative(inputs.get("EEV"), "EEV")
    es = _require_non_negative(inputs.get("Es"), "Es")
    el = _require_non_negative(inputs.get("EL"), "EL")
    et = _require_non_negative(inputs.get("Et"), "Et")

    # --- Eq. 3.1: AFe = AF - ΣAfk ---
    excluded_zones = inputs.get("excluded_zones")
    exempt_areas = [float(x) for x in inputs.get("exempt_areas", [])]
    for idx, area in enumerate(exempt_areas):
        if area < 0:
            raise HTTPException(status_code=422, detail=f"'exempt_areas[{idx}]' must be >= 0")
    _validate_optional_excluded_zones_shape(excluded_zones)
    exclusion_result = None
    if isinstance(excluded_zones, list):
        afe, exclusion_result = calculate_afe_from_excluded_zones(af, excluded_zones, trace)
        afk_total_m2 = exclusion_result["afk_total_m2"]
    else:
        afe = calculate_afe(af, exempt_areas, trace)
        afk_total_m2 = sum(exempt_areas)

    # --- Eq. 3.2: EtEUI ---
    eteui = calculate_eteui(elevators, afe, trace)

    # --- Eq. 3.3 ~ 3.5: weights a,b,c ---
    weights = calculate_weights(aeui, leui, eteui, trace)

    # --- Eq. 3.6: EEI ---
    eei = calculate_eei_bersn(
        weights["a"],
        weights["b"],
        weights["c"],
        eac,
        eev,
        es,
        el,
        et,
        trace,
    )

    outputs = {
        "AF": af,
        "AFk_total_m2": afk_total_m2,
        "AFe": afe,
        "EtEUI": eteui,
        "weights": weights,
        "EEI": eei,
        "inputs_used": {
            "AEUI": aeui,
            "LEUI": leui,
            "EAC": eac,
            "EEV": eev,
            "Es": es,
            "EL": el,
            "Et": et,
        },
    }

    if exclusion_result is not None:
        outputs["excluded_zone_evaluation"] = exclusion_result["evaluated_zones"]

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# For Eq. 3.6 only (general branch EEI without hot water)
@app.post("/calc/bersn/formulas/eei-general", response_model=FormulaResponse)
def run_eei_general_formula(request: FormulaRequest):
    """Compute only Eq. 3.6 using provided weights and efficiency inputs."""
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    _require_fields(inputs, ["a", "b", "c", "EAC", "EEV", "Es", "EL", "Et"])

    a = _require_in_range(inputs.get("a"), "a", 0.0, 1.0)
    b = _require_in_range(inputs.get("b"), "b", 0.0, 1.0)
    c = _require_in_range(inputs.get("c"), "c", 0.0, 1.0)
    _validate_weights_sum(a, b, c)
    eac = _require_non_negative(inputs.get("EAC"), "EAC")
    eev = _require_non_negative(inputs.get("EEV"), "EEV")
    es = _require_non_negative(inputs.get("Es"), "Es")
    el = _require_non_negative(inputs.get("EL"), "EL")
    et = _require_non_negative(inputs.get("Et"), "Et")

    eei = calculate_eei_bersn(a, b, c, eac, eev, es, el, et, trace)

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs={"EEI": eei},
        trace=trace.build(),
    )


# For 3-4 score (SCOREEE) from EEI using Eq. 3.16a / 3.16b
@app.post("/calc/bersn/formulas/score-general", response_model=FormulaResponse)
def run_score_general_formula(request: FormulaRequest):
    """Compute only SCOREEE (Section 3-4) from a provided EEI."""
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    if inputs.get("EEI") is None:
        raise HTTPException(status_code=422, detail="Missing EEI")

    eei = _require_non_negative(inputs.get("EEI"), "EEI")
    score = calculate_score(eei, trace)

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs={
            "EEI": eei,
            "SCOREEE": score,
        },
        trace=trace.build(),
    )


# For 3-5 scale values (Eq. 3.17~3.20)
@app.post("/calc/bersn/formulas/scale-values-general", response_model=FormulaResponse)
def run_scale_values_general_formula(request: FormulaRequest):
    """Compute EUIn/EUIg/EUIm/EUImax for general branch (HpEUI defaults to 0)."""
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    required_fields = ["AEUI", "LEUI", "EEUI", "EtEUI", "UR"]
    for field in required_fields:
        if inputs.get(field) is None:
            raise HTTPException(status_code=422, detail=f"Missing {field}")

    aeui = _to_float(inputs.get("AEUI"), "AEUI")
    leui = _to_float(inputs.get("LEUI"), "LEUI")
    eeui = _to_float(inputs.get("EEUI"), "EEUI")
    eteui = _to_float(inputs.get("EtEUI"), "EtEUI")
    ur = _require_in_range(inputs.get("UR"), "UR", 0.0, 1.0)
    hpeui = _to_float(inputs.get("HpEUI", 0.0), "HpEUI")

    try:
        outputs = calculate_scale_values(
            aeui=aeui,
            leui=leui,
            eeui=eeui,
            eteui=eteui,
            ur=ur,
            hpeui=hpeui,
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# For 3-6 indicators (Eq. 3.21~3.24)
@app.post("/calc/bersn/formulas/indicators-general", response_model=FormulaResponse)
def run_indicators_general_formula(request: FormulaRequest):
    """Compute EUI*/CEI*/TEUI/ESR from SCOREEE + scale values for general branch."""
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    required_fields = ["SCOREEE", "EUIn", "EUIg", "EUIm", "EUImax", "beta1", "CFn"]
    for field in required_fields:
        if inputs.get(field) is None:
            raise HTTPException(status_code=422, detail=f"Missing {field}")

    score_eee = _to_float(inputs.get("SCOREEE"), "SCOREEE")
    eui_n = _to_float(inputs.get("EUIn"), "EUIn")
    eui_g = _to_float(inputs.get("EUIg"), "EUIg")
    eui_m = _to_float(inputs.get("EUIm"), "EUIm")
    eui_max = _to_float(inputs.get("EUImax"), "EUImax")
    beta1 = _require_positive(inputs.get("beta1"), "beta1")
    cfn = _require_positive(inputs.get("CFn"), "CFn")

    try:
        outputs = calculate_indicators(
            score_eee=score_eee,
            eui_n=eui_n,
            eui_g=eui_g,
            eui_m=eui_m,
            eui_max=eui_max,
            beta1=beta1,
            cfn=cfn,
            trace=trace,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# For 3-7 grade mapping (Table 3.4)
@app.post("/calc/bersn/formulas/grade-general", response_model=FormulaResponse)
def run_grade_general_formula(request: FormulaRequest):
    """Compute final grade (1+~7) from SCOREEE + EUI* + scale thresholds."""
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    required_fields = ["SCOREEE", "EUI_star", "EUIn", "EUIg", "EUImax"]
    for field in required_fields:
        if inputs.get(field) is None:
            raise HTTPException(status_code=422, detail=f"Missing {field}")

    score_eee = _to_float(inputs.get("SCOREEE"), "SCOREEE")
    eui_star = _to_float(inputs.get("EUI_star"), "EUI_star")
    eui_n = _to_float(inputs.get("EUIn"), "EUIn")
    eui_g = _to_float(inputs.get("EUIg"), "EUIg")
    eui_max = _to_float(inputs.get("EUImax"), "EUImax")

    outputs = calculate_grade(
        score_eee=score_eee,
        eui_star=eui_star,
        eui_n=eui_n,
        eui_g=eui_g,
        eui_max=eui_max,
        trace=trace,
    )

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# End-to-end general branch pipeline (no hot water): 3-2-1 -> 3-7
@app.post("/calc/bersn/formulas/general-full", response_model=FormulaResponse)
def run_general_full_formula(request: FormulaRequest):
    """
    Execute full general BERSn formula chain in one call:
      3-2-1 + Eq.3.1 + Eq.3.2 + Eq.3.3~3.5 + Eq.3.6 + 3-4 + 3-5 + 3-6 + 3-7
    """
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    # Required fields for general (no-hot-water) branch.
    required_fields = [
        "AF", "elevators",
        "AEUI", "LEUI", "EEUI", "UR",
        "Es", "Et",
        "beta1", "CFn",
    ]
    _require_fields(inputs, required_fields)

    af = _require_positive(inputs.get("AF"), "AF")
    excluded_zones = inputs.get("excluded_zones")
    exempt_areas = inputs.get("exempt_areas", [])
    elevators = _require_list(inputs.get("elevators", []), "elevators")
    _validate_elevators(elevators)

    aeui = _require_non_negative(inputs.get("AEUI"), "AEUI")
    leui = _require_non_negative(inputs.get("LEUI"), "LEUI")
    eeui = _require_non_negative(inputs.get("EEUI"), "EEUI")
    ur = _require_in_range(inputs.get("UR"), "UR", 0.0, 1.0)
    hpeui = _require_non_negative(inputs.get("HpEUI", 0.0), "HpEUI")

    # 3-2-2 preprocessing for EEV/EAC/EL:
    # - If direct values are provided, use them.
    # - Otherwise, reuse preprocess-efficiency endpoint logic to compute from Appendix-2 inputs.
    if (
        inputs.get("EEV") is not None
        and inputs.get("EAC") is not None
        and inputs.get("EL") is not None
    ):
        eev = _require_non_negative(inputs.get("EEV"), "EEV")
        eac = _require_non_negative(inputs.get("EAC"), "EAC")
        el = _require_non_negative(inputs.get("EL"), "EL")
        trace.add_step(
            description="Use provided EEV/EAC/EL in general-full",
            inputs={"equation": "3-2-2", "mode": "provided_directly"},
            result={"EEV": eev, "EAC": eac, "EL": el},
        )
    else:
        preprocess_resp = run_preprocess_efficiency(request)
        prep_outputs = preprocess_resp.outputs or {}
        eev = _to_float(prep_outputs.get("EEV"), "EEV")
        eac = _to_float(prep_outputs.get("EAC"), "EAC")
        el = _to_float(prep_outputs.get("EL"), "EL")
        trace.add_step(
            description="Reuse /formulas/preprocess-efficiency in general-full",
            inputs={"equation": "3-2-2", "mode": "computed_or_mixed"},
            result={
                "EEV": eev,
                "EAC": eac,
                "EL": el,
                "preprocess_sources": prep_outputs.get("preprocess_sources"),
            },
        )

    es = _require_non_negative(inputs.get("Es"), "Es")
    et = _require_non_negative(inputs.get("Et"), "Et")
    beta1 = _require_positive(inputs.get("beta1"), "beta1")
    cfn = _require_positive(inputs.get("CFn"), "CFn")

    # 3-2-1 + Eq. 3.1
    exclusion_result = None
    _validate_optional_excluded_zones_shape(excluded_zones)
    if isinstance(excluded_zones, list):
        afe, exclusion_result = calculate_afe_from_excluded_zones(af, excluded_zones, trace)
        afk_total_m2 = exclusion_result["afk_total_m2"]
    else:
        exempt_areas = [float(x) for x in exempt_areas]
        for idx, area in enumerate(exempt_areas):
            if area < 0:
                raise HTTPException(status_code=422, detail=f"'exempt_areas[{idx}]' must be >= 0")
        afe = calculate_afe(af, exempt_areas, trace)
        afk_total_m2 = sum(exempt_areas)

    # Eq. 3.2
    eteui = calculate_eteui(elevators, afe, trace)

    # Eq. 3.3~3.5
    weights = calculate_weights(aeui, leui, eteui, trace)

    # Eq. 3.6
    eei = calculate_eei_bersn(
        weights["a"], weights["b"], weights["c"], eac, eev, es, el, et, trace
    )

    # 3-4
    score = calculate_score(eei, trace)

    # 3-5
    scale_values = calculate_scale_values(
        aeui=aeui,
        leui=leui,
        eeui=eeui,
        eteui=eteui,
        ur=ur,
        hpeui=hpeui,
        trace=trace,
    )

    # 3-6
    indicators = calculate_indicators(
        score_eee=score,
        eui_n=scale_values["EUIn"],
        eui_g=scale_values["EUIg"],
        eui_m=scale_values["EUIm"],
        eui_max=scale_values["EUImax"],
        beta1=beta1,
        cfn=cfn,
        trace=trace,
    )

    # 3-7
    grade_result = calculate_grade(
        score_eee=score,
        eui_star=indicators["EUI_star"],
        eui_n=scale_values["EUIn"],
        eui_g=scale_values["EUIg"],
        eui_max=scale_values["EUImax"],
        trace=trace,
    )

    outputs = {
        "AF": af,
        "AFk_total_m2": afk_total_m2,
        "AFe": afe,
        "EtEUI": eteui,
        "weights": weights,
        "EEI": eei,
        "SCOREEE": score,
        "scale_values": scale_values,
        "indicators": indicators,
        "grade_result": grade_result,
    }

    if exclusion_result is not None:
        outputs["excluded_zone_evaluation"] = exclusion_result["evaluated_zones"]

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )


# End-to-end hot-water branch pipeline: 3-2-1 -> 3-7 with 3-3-2 branch
@app.post("/calc/bersn/formulas/hotwater-full", response_model=FormulaResponse)
def run_hotwater_full_formula(request: FormulaRequest):
    """
    Execute full hot-water BERSn formula chain:
      3-2-1 + Eq.3.1 + Eq.3.2 + (Eq.3.7~3.10 preprocess) + Eq.3.11~3.15 + 3-4 + 3-5 + 3-6 + 3-7
    """
    trace = TraceBuilder()
    _validate_formula_request_meta(request)
    inputs = request.inputs or {}

    required_fields = [
        "AF", "elevators",
        "AEUI", "LEUI", "EEUI", "UR",
        "Es", "Et",
        "beta1", "CFn",
        "hotwater_category",
    ]
    _require_fields(inputs, required_fields)

    af = _require_positive(inputs.get("AF"), "AF")
    excluded_zones = inputs.get("excluded_zones")
    exempt_areas = inputs.get("exempt_areas", [])
    elevators = _require_list(inputs.get("elevators", []), "elevators")
    _validate_elevators(elevators)

    aeui = _require_non_negative(inputs.get("AEUI"), "AEUI")
    leui = _require_non_negative(inputs.get("LEUI"), "LEUI")
    eeui = _require_non_negative(inputs.get("EEUI"), "EEUI")
    ur = _require_in_range(inputs.get("UR"), "UR", 0.0, 1.0)

    # 3-2-2 preprocessing for EEV/EAC/EL (same as general-full behavior)
    if (
        inputs.get("EEV") is not None
        and inputs.get("EAC") is not None
        and inputs.get("EL") is not None
    ):
        eev = _require_non_negative(inputs.get("EEV"), "EEV")
        eac = _require_non_negative(inputs.get("EAC"), "EAC")
        el = _require_non_negative(inputs.get("EL"), "EL")
        trace.add_step(
            description="Use provided EEV/EAC/EL in hotwater-full",
            inputs={"equation": "3-2-2", "mode": "provided_directly"},
            result={"EEV": eev, "EAC": eac, "EL": el},
        )
    else:
        preprocess_resp = run_preprocess_efficiency(request)
        prep_outputs = preprocess_resp.outputs or {}
        eev = _to_float(prep_outputs.get("EEV"), "EEV")
        eac = _to_float(prep_outputs.get("EAC"), "EAC")
        el = _to_float(prep_outputs.get("EL"), "EL")
        trace.add_step(
            description="Reuse /formulas/preprocess-efficiency in hotwater-full",
            inputs={"equation": "3-2-2", "mode": "computed_or_mixed"},
            result={
                "EEV": eev,
                "EAC": eac,
                "EL": el,
                "preprocess_sources": prep_outputs.get("preprocess_sources"),
            },
        )

    es = _require_non_negative(inputs.get("Es"), "Es")
    et = _require_non_negative(inputs.get("Et"), "Et")
    beta1 = _require_positive(inputs.get("beta1"), "beta1")
    cfn = _require_positive(inputs.get("CFn"), "CFn")

    # 3-2-1 + Eq. 3.1
    exclusion_result = None
    _validate_optional_excluded_zones_shape(excluded_zones)
    if isinstance(excluded_zones, list):
        afe, exclusion_result = calculate_afe_from_excluded_zones(af, excluded_zones, trace)
        afk_total_m2 = exclusion_result["afk_total_m2"]
    else:
        exempt_areas = [float(x) for x in exempt_areas]
        for idx, area in enumerate(exempt_areas):
            if area < 0:
                raise HTTPException(status_code=422, detail=f"'exempt_areas[{idx}]' must be >= 0")
        afe = calculate_afe(af, exempt_areas, trace)
        afk_total_m2 = sum(exempt_areas)

    # Eq. 3.2
    eteui = calculate_eteui(elevators, afe, trace)

    # 3-3-2 preprocess (Eq.3.7~3.10)
    try:
        table_3_3 = load_json_table("table_3_3_hotwater_defaults.json", version=request.formula_version)
    except TableLoadError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        hotwater_outputs = calculate_hotwater_preprocess(
            category=inputs.get("hotwater_category"),
            afe=afe,
            hotwater_system_type=inputs.get("hotwater_system_type"),
            table_3_3=table_3_3,
            trace=trace,
            hwi_override=inputs.get("hwi_override"),
            npi=inputs.get("NPi"),
            afw=inputs.get("Afw"),
            oh=inputs.get("OH"),
            vp=inputs.get("Vp"),
            vs=inputs.get("Vs"),
            ehw_override=inputs.get("ehw_override"),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    hpeui = _to_float(hotwater_outputs.get("HpEUI"), "HpEUI")
    ehw = _to_float(hotwater_outputs.get("EHW"), "EHW")

    # Eq. 3.11~3.14
    weights = calculate_weights_hotwater(aeui, leui, eteui, hpeui, trace)

    # Eq. 3.15
    eei = calculate_eei_hotwater(
        weights["a"], weights["b"], weights["c"], weights["d"],
        eac, eev, es, el, et, ehw, trace
    )

    # 3-4
    score = calculate_score(eei, trace)

    # 3-5 (with hot-water hpeui)
    scale_values = calculate_scale_values(
        aeui=aeui,
        leui=leui,
        eeui=eeui,
        eteui=eteui,
        ur=ur,
        hpeui=hpeui,
        trace=trace,
    )

    # 3-6
    indicators = calculate_indicators(
        score_eee=score,
        eui_n=scale_values["EUIn"],
        eui_g=scale_values["EUIg"],
        eui_m=scale_values["EUIm"],
        eui_max=scale_values["EUImax"],
        beta1=beta1,
        cfn=cfn,
        trace=trace,
    )

    # 3-7
    grade_result = calculate_grade(
        score_eee=score,
        eui_star=indicators["EUI_star"],
        eui_n=scale_values["EUIn"],
        eui_g=scale_values["EUIg"],
        eui_max=scale_values["EUImax"],
        trace=trace,
    )

    outputs = {
        "AF": af,
        "AFk_total_m2": afk_total_m2,
        "AFe": afe,
        "EtEUI": eteui,
        "hotwater": hotwater_outputs,
        "weights": weights,
        "EEI": eei,
        "SCOREEE": score,
        "scale_values": scale_values,
        "indicators": indicators,
        "grade_result": grade_result,
    }

    if exclusion_result is not None:
        outputs["excluded_zone_evaluation"] = exclusion_result["evaluated_zones"]

    return FormulaResponse(
        calc_run_id=request.calc_run_id,
        formula_version=request.formula_version,
        outputs=outputs,
        trace=trace.build(),
    )
