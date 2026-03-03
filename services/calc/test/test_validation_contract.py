from fastapi.testclient import TestClient
import pytest

import app.main as main


@pytest.fixture()
def client(monkeypatch):
    """
    Stub data-table loading for endpoints that require JSON lookup files.
    Keep tests deterministic and independent from file I/O.
    """
    original = main.load_json_table

    hotwater_defaults_table = {
        "rows": [
            {"building_category": "hotel", "hwi_value": 0.0135},
            {"building_category": "long_term_care_or_hospital", "hwi_value": 0.0135},
            {"building_category": "dormitory", "hwi_value": 0.0135},
            {"building_category": "fitness_leisure", "hwi_value": 0.0135},
        ],
        "derived_constants_for_engine": {
            "hpc_a_group_kw_per_m3": 2.08,
            "hpc_fitness_shower_kw_per_m3": 2.08,
            "hpc_fitness_pool_spa_kw_per_m3": 1.2,
            "hot_water_operation_hours_design": 8.0,
            "hp_eui_load_factor": 0.7,
        },
    }

    def _stub_loader(filename, version="v1.0"):
        if filename == "table_3_3_hotwater_defaults.json":
            return hotwater_defaults_table
        return original(filename, version)

    monkeypatch.setattr(main, "load_json_table", _stub_loader)
    return TestClient(main.app)


def _assert_error_shape(payload):
    assert payload["ok"] is False
    assert isinstance(payload.get("error_code"), str) and payload["error_code"]
    assert isinstance(payload.get("message"), str) and payload["message"]


def test_request_validation_error_contract_when_body_is_missing(client):
    resp = client.post("/calc/bersn/formulas/afe")
    assert resp.status_code == 422
    data = resp.json()
    _assert_error_shape(data)
    assert data["error_code"] == "BERSN_REQUEST_VALIDATION_ERROR"
    assert isinstance(data.get("details"), dict)
    assert isinstance(data["details"].get("errors"), list)
    assert isinstance(data["details"].get("request_id"), str)


def test_input_validation_error_contract_invalid_formula_version(client):
    resp = client.post(
        "/calc/bersn/formulas/afe",
        json={
            "calc_run_id": "t-invalid-ver",
            "formula_version": "v2.0",
            "inputs": {"AF": 1000, "exempt_areas": [100]},
        },
    )
    assert resp.status_code == 422
    data = resp.json()
    _assert_error_shape(data)
    assert data["error_code"] == "BERSN_INPUT_VALIDATION_ERROR"
    assert "formula_version" in data["message"]


def test_input_validation_error_contract_invalid_weights_sum(client):
    resp = client.post(
        "/calc/bersn/formulas/eei-general",
        json={
            "calc_run_id": "t-bad-w",
            "formula_version": "v1.0",
            "inputs": {
                "a": 0.7,
                "b": 0.2,
                "c": 0.2,  # sum = 1.1 -> should fail
                "EAC": 0.72,
                "EEV": 0.85,
                "Es": 0.05,
                "EL": 0.65,
                "Et": 0.5,
            },
        },
    )
    assert resp.status_code == 422
    data = resp.json()
    _assert_error_shape(data)
    assert data["error_code"] == "BERSN_INPUT_VALIDATION_ERROR"
    assert "weights must sum" in data["message"]


def test_input_validation_error_contract_invalid_ur_range(client):
    resp = client.post(
        "/calc/bersn/formulas/scale-values-general",
        json={
            "calc_run_id": "t-bad-ur",
            "formula_version": "v1.0",
            "inputs": {
                "AEUI": 42.4,
                "LEUI": 20.0,
                "EEUI": 6.0,
                "EtEUI": 4.84,
                "UR": 1.2,  # out of [0,1]
            },
        },
    )
    assert resp.status_code == 422
    data = resp.json()
    _assert_error_shape(data)
    assert data["error_code"] == "BERSN_INPUT_VALIDATION_ERROR"
    assert "UR" in data["message"]


def test_general_full_smoke_success(client):
    resp = client.post(
        "/calc/bersn/formulas/general-full",
        json={
            "calc_run_id": "t-general-smoke",
            "formula_version": "v1.0",
            "inputs": {
                "AF": 12000,
                "excluded_zones": [{"type": "indoor_parking", "area_m2": 1800}],
                "elevators": [{"Nej": 4, "Eelj": 8.24, "YOHj": 2500}],
                "AEUI": 42.4,
                "LEUI": 20.0,
                "EEUI": 6.0,
                "UR": 1.0,
                "EAC": 0.72,
                "EEV": 0.85,
                "Es": 0.05,
                "EL": 0.65,
                "Et": 0.5,
                "beta1": 0.494,
                "CFn": 0.91,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert out["AFe"] > 0
    assert out["EEI"] >= 0
    assert "grade_result" in out
    assert isinstance(resp.json()["trace"]["formulas_used"], list)


def test_hotwater_full_smoke_success(client):
    resp = client.post(
        "/calc/bersn/formulas/hotwater-full",
        json={
            "calc_run_id": "t-hotwater-smoke",
            "formula_version": "v1.0",
            "inputs": {
                "AF": 12000,
                "excluded_zones": [{"type": "indoor_parking", "area_m2": 1800}],
                "elevators": [{"Nej": 4, "Eelj": 8.24, "YOHj": 2500}],
                "AEUI": 42.4,
                "LEUI": 20.0,
                "EEUI": 6.0,
                "UR": 1.0,
                "EAC": 0.71,
                "EEV": 0.85,
                "Es": 0.05,
                "EL": 0.4921367521367521,
                "Et": 0.5,
                "beta1": 0.494,
                "CFn": 0.91,
                "hotwater_category": "hotel",
                "hotwater_system_type": "electric_storage",
                "NPi": 300,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert out["AFe"] > 0
    assert out["EEI"] >= 0
    assert out["hotwater"]["category"] == "hotel"
    assert "grade_result" in out
