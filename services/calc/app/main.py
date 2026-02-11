from fastapi import FastAPI
from pydantic import BaseModel
from uuid import uuid4

app = FastAPI(title="BERSn Calculation Engine")


class CalcRequest(BaseModel):
    calc_run_id: str
    branch_type: str
    formula_version: str
    inputs: dict


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/calc/bersn/run")
def run_calc(request: CalcRequest):
    # Temporary mock calculation (real formulas later)
    return {
        "calc_run_id": request.calc_run_id,
        "branch_type": request.branch_type,
        "formula_version": request.formula_version,
        "score": 85,
        "grade": "Level-1",
        "outputs": {
            "EUI": 120,
            "reference_EUI": 140
        },
        "warnings": [],
        "intermediates": {},
        "trace": {
            "engine_version": "v0.1-dev"
        }
    }
