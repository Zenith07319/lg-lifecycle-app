"""LG ThinQ 연동 라우터 — 설문 시작 시 내 에어컨 자동 불러오기."""
from fastapi import APIRouter

from app.services import thinq_service

router = APIRouter(prefix="/api/thinq", tags=["thinq"])


@router.get("/devices")
async def devices():
    """연결된 LG 계정의 에어컨 목록(없거나 실패 시 mock 1대)."""
    return await thinq_service.list_ac_devices()


@router.get("/prefill")
async def prefill(device_id: str):
    """선택 기기 → 설문 프리필값(냉방능력·월소비전력·연식·필터 + resolved 플래그)."""
    return await thinq_service.get_prefill(device_id)
