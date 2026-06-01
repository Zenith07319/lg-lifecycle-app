import uuid
from fastapi import APIRouter, HTTPException, Request
from app.models.request import DiagnoseRequest
from app.services.calculation import run_full_pipeline
from app.services.session import save_session, load_session, log_diagnosis

router = APIRouter(prefix="/api", tags=["diagnosis"])

DISCLAIMER = "현재 입력 조건 기준 추정 결과입니다. 정확한 고장 예측이 아닙니다."


@router.post("/diagnose")
async def diagnose(req: DiagnoseRequest):
    try:
        result = run_full_pipeline(req.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    session_id = str(uuid.uuid4())
    save_session(session_id, result)

    diag = result["diagnosis"]
    top  = result["ranked_options"][0] if result["ranked_options"] else {}
    log_diagnosis(diag, req.model_dump(), top.get("label", ""))

    return {
        "session_id":          session_id,
        "health_grade":        diag["health_grade"],
        "health_score":        diag["health_score"],
        "inspection_score_100": diag["inspection_score_100"],
        "grade_description":   diag["grade_description"],
        "energy_waste_ratio":  diag["energy_waste_ratio"],
        "inconvenience":       diag["inconvenience"],
        "age_years":           diag["age_years"],
        "bill_base_total":     result["bill_base_total"],
        "ac_delta_old":        result["delta_old"]["ac_delta_cost"],
        "ac_delta_new":        result["delta_new"]["ac_delta_cost"],
        "tier_old":            result["delta_old"]["tier_with_ac"],
        "tier_new":            result["delta_new"]["tier_with_ac"],
        "tier_changed":        result["delta_old"]["tier_changed"],
        "k_ac_old":            result["k_ac_old"],
        "k_ac_new":            result["k_ac_new"],
        "disclaimer":          DISCLAIMER,
    }


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션이 없거나 만료되었습니다.")
    return {**session, "disclaimer": DISCLAIMER}


@router.get("/health")
async def health():
    return {"status": "ok"}
