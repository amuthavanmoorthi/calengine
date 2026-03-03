import pytest
from fastapi.testclient import TestClient

import app.main as main


TEST_TABLE = {
    "rows": [
        # low altitude itemized UAF for 40%>=WWR>30%
        {
            "scheme": "ALTITUDE_LT_800_ITEMIZED",
            "indicator": "UAF",
            "altitude_max_m": 800,
            "wwr_min": 0.3,
            "wwr_max": 0.4,
            "wwr_min_exclusive": True,
            "wwr_max_inclusive": True,
            "EVc": {"type": "const", "value": 3.5},
            "EVmin": {"type": "const", "value": 1.8},
        },
        # low altitude itemized SF accommodation
        {
            "scheme": "ALTITUDE_LT_800_ITEMIZED",
            "indicator": "SF",
            "altitude_max_m": 800,
            "wwr_min": 0.3,
            "wwr_max": 0.4,
            "wwr_min_exclusive": True,
            "wwr_max_inclusive": True,
            "building_group": "ACCOMMODATION",
            "EVc": {"type": "const", "value": 0.25},
            "EVmin": {"type": "const", "value": 0.13},
        },
        # total envload hotel guestroom north
        {
            "scheme": "TOTAL_ENVLOAD",
            "indicator": "ENVLOAD",
            "altitude_max_m": 800,
            "climate_region": "NORTH",
            "building_group": "HOTEL_GUESTROOM",
            "EVc": {"type": "const", "value": 110},
            "EVmin": {"type": "const", "value": 76},
        },
        # poly2 example
        {
            "scheme": "TOTAL_ENVLOAD",
            "indicator": "AWSG_X_POLY",
            "altitude_max_m": 800,
            "climate_region": "NORTH",
            "building_group": "LARGE_SPACE_A1_D1",
            "EVc": {"type": "poly2", "var": "X", "a": 146.2, "b": -414.9, "c": 276},
            "EVmin": {"type": "poly2", "var": "X", "a": 73.1, "b": -207.5, "c": 138},
        },
    ]
}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(main, "load_json_table", lambda filename, version="v1.0": TEST_TABLE)
    return TestClient(main.app)


def test_eev_itemized_uaf(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t1",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel", "altitude_m": 10},
                "ev_scheme": "ALTITUDE_LT_800_ITEMIZED",
                "ev_indicator": "UAF",
                "EV": 2.8,
                "envelope": {"wall_area": 1600, "window_area": 600},  # WWR=0.375
            },
        },
    )
    assert resp.status_code == 200
    eev = resp.json()["outputs"]["EEV"]
    # (3.5-2.8)/(3.5-1.8)=0.7/1.7
    assert abs(eev - (0.7 / 1.7)) < 1e-9


def test_eev_itemized_sf_accommodation(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t2",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel", "altitude_m": 10},
                "ev_scheme": "ALTITUDE_LT_800_ITEMIZED",
                "ev_indicator": "SF",
                "EV": 0.20,
                "envelope": {"wall_area": 1600, "window_area": 600},  # WWR=0.375
            },
        },
    )
    assert resp.status_code == 200
    eev = resp.json()["outputs"]["EEV"]
    assert abs(eev - ((0.25 - 0.20) / (0.25 - 0.13))) < 1e-9


def test_eev_total_envload_hotel_north_inferred_group(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t3",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel", "altitude_m": 10, "climate_region": "NORTH"},
                "ev_scheme": "TOTAL_ENVLOAD",
                "ev_indicator": "ENVLOAD",
                "EV": 90,
            },
        },
    )
    assert resp.status_code == 200
    eev = resp.json()["outputs"]["EEV"]
    assert abs(eev - ((110 - 90) / (110 - 76))) < 1e-9


def test_eev_poly2_requires_wwr_x(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t4",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel", "altitude_m": 10, "climate_region": "NORTH"},
                "ev_scheme": "TOTAL_ENVLOAD",
                "ev_indicator": "AWSG_X_POLY",
                "ev_table_group": "LARGE_SPACE_A1_D1",
                "EV": 120,
                "wwr": 0.30,
            },
        },
    )
    assert resp.status_code == 200


def test_missing_altitude_returns_422(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t5",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel"},
                "ev_scheme": "ALTITUDE_LT_800_ITEMIZED",
                "ev_indicator": "UAF",
                "EV": 2.8,
                "wwr": 0.375,
            },
        },
    )
    assert resp.status_code == 422


def test_total_envload_requires_climate_region(client):
    resp = client.post(
        "/calc/bersn/formulas/eev",
        json={
            "calc_run_id": "t6",
            "formula_version": "v1.0",
            "inputs": {
                "building": {"building_type": "Hotel", "altitude_m": 10},
                "ev_scheme": "TOTAL_ENVLOAD",
                "ev_indicator": "ENVLOAD",
                "EV": 90,
            },
        },
    )
    assert resp.status_code == 422
