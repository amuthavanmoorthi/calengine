import pytest
from fastapi.testclient import TestClient

import app.main as main


TEST_RENEWABLE_TABLE = {
    "global_constants": {
        "pv_generation_correction_factor": 0.9,
        "days_per_year": 365,
        "pv_area_per_kw_m2_per_kw": 7.0,
        "lng_co2_conversion_factor_kgco2_per_m3": 2.09,
        "afforestation_co2_conversion_factor_kgco2_per_m2_yr": 1.5,
    },
    "renewable_power_usage_factor_T": {
        "self_use": 1.0,
        "sell_to_grid": 0.5,
        "renewable_certificate_purchase": 0.5,
        "none": 0.0,
    },
}


@pytest.fixture()
def client(monkeypatch):
    original = main.load_json_table

    def _stub_loader(filename, version="v1.0"):
        if filename == "renewable_bonus_table_3_5.json":
            return TEST_RENEWABLE_TABLE
        return original(filename, version)

    monkeypatch.setattr(main, "load_json_table", _stub_loader)
    return TestClient(main.app)


def test_renewable_preprocess_pv_success(client):
    resp = client.post(
        "/calc/bersn/formulas/renewable-preprocess",
        json={
            "calc_run_id": "ren-1",
            "formula_version": "v1.0",
            "inputs": {
                "renewable_type": "pv",
                "renewable_power_usage_type": "self_use",
                "PV_installed_capacity_kW": 100,
                "pv_max_generation_efficiency_kwh_per_kw_day": 3.55,
                "AFe": 10200,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert abs(out["GE"] - 116617.5) < 1e-9
    assert abs(out["pv_equivalent_area_m2"] - 700.0) < 1e-9
    assert abs(out["Rs"] - (700.0 / 10200.0)) < 1e-12


def test_renewable_preprocess_missing_pv_eff_422(client):
    resp = client.post(
        "/calc/bersn/formulas/renewable-preprocess",
        json={
            "calc_run_id": "ren-2",
            "formula_version": "v1.0",
            "inputs": {
                "renewable_type": "pv",
                "renewable_power_usage_type": "self_use",
                "PV_installed_capacity_kW": 100,
            },
        },
    )
    assert resp.status_code == 422
    assert "pv_max_generation_efficiency_kwh_per_kw_day" in resp.text


def test_renewable_bonus_pv_area_caps_rs_to_1(client):
    resp = client.post(
        "/calc/bersn/formulas/renewable-bonus",
        json={
            "calc_run_id": "ren-3",
            "formula_version": "v1.0",
            "inputs": {
                "method": "pv_area_method",
                "SCOREEE_before": 70,
                "T": 1.0,
                "Rs": 2.0,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert out["Rs_used"] == 1.0
    assert abs(out["gamma"] - 0.1) < 1e-12
    assert abs(out["SCOREEE_after"] - 77.0) < 1e-12


def test_renewable_bonus_generation_applies_110_percent_cap(client):
    resp = client.post(
        "/calc/bersn/formulas/renewable-bonus",
        json={
            "calc_run_id": "ren-4",
            "formula_version": "v1.0",
            "inputs": {
                "method": "generation_method",
                "EEI_before": 0.6661,
                "EUI_star": 53.94,
                "AFe": 10200,
                "GE": 50000,
                "SCOREEE_before": 67.85,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert abs(out["SCOREEE_cap_110_percent"] - (67.85 * 1.1)) < 1e-12
    assert out["SCOREEE_after"] <= out["SCOREEE_cap_110_percent"] + 1e-12


def test_nzb_eligibility_accepts_only_grade_1_plus(client):
    ok = client.post(
        "/calc/bersn/formulas/nzb-eligibility",
        json={
            "calc_run_id": "nzb-1",
            "formula_version": "v1.0",
            "inputs": {"grade": "1+"},
        },
    )
    assert ok.status_code == 200
    assert ok.json()["outputs"]["is_grade_eligible"] is True

    no = client.post(
        "/calc/bersn/formulas/nzb-eligibility",
        json={
            "calc_run_id": "nzb-2",
            "formula_version": "v1.0",
            "inputs": {"grade": "1"},
        },
    )
    assert no.status_code == 200
    assert no.json()["outputs"]["is_grade_eligible"] is False


def test_nzb_balance_fail_when_tge_below_te(client):
    resp = client.post(
        "/calc/bersn/formulas/nzb-balance",
        json={
            "calc_run_id": "nzb-3",
            "formula_version": "v1.0",
            "inputs": {
                "TEUI": 55.1,
                "AFe": 10200,
                "TGE": 1000,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert out["is_balance_pass"] is False
    assert out["nzb_balance_margin"] < 0


def test_nzb_evaluate_fails_if_grade_not_1_plus_even_when_balance_passes(client):
    resp = client.post(
        "/calc/bersn/formulas/nzb-evaluate",
        json={
            "calc_run_id": "nzb-4",
            "formula_version": "v1.0",
            "inputs": {
                "grade": "2",
                "TEUI": 55.1,
                "AFe": 10200,
                "TGE": 9999999,
            },
        },
    )
    assert resp.status_code == 200
    out = resp.json()["outputs"]
    assert out["grade_gate"]["is_grade_eligible"] is False
    assert out["balance_check"]["is_balance_pass"] is True
    assert out["is_nzb_pass"] is False
