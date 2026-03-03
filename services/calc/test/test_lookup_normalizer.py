import pytest
from fastapi import HTTPException

from app.utils.lookup_normalizer import normalize_building_lookup


def test_building_type_hotel_titlecase():
    b = normalize_building_lookup({"building_type": "Hotel", "altitude_m": 50})
    assert b["building_type"] == "HOTEL"
    assert b["accommodation_group"] == "ACCOMMODATION"


def test_building_type_hotel_chinese():
    b = normalize_building_lookup({"building_type": "飯店", "altitude_m": 0})
    assert b["building_type"] == "HOTEL"
    assert b["accommodation_group"] == "ACCOMMODATION"


def test_altitude_missing_raises_422():
    with pytest.raises(HTTPException) as ex:
        normalize_building_lookup({"building_type": "Hotel"})
    assert ex.value.status_code == 422
    assert "altitude_m" in ex.value.detail


def test_altitude_non_numeric_raises_422():
    with pytest.raises(HTTPException) as ex:
        normalize_building_lookup({"building_type": "Hotel", "altitude_m": "abc"})
    assert ex.value.status_code == 422


def test_climate_region_normalizes_chinese():
    b = normalize_building_lookup({"building_type": "Hotel", "altitude_m": 10, "climate_region": "北區"})
    assert b["climate_region"] == "NORTH"


def test_climate_region_invalid_raises_422():
    with pytest.raises(HTTPException) as ex:
        normalize_building_lookup({"building_type": "Hotel", "altitude_m": 10, "climate_region": "Taoyuan"})
    assert ex.value.status_code == 422
