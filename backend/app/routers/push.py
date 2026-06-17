"""웹 푸시 라우터 — 여름 전 점검 알림 구독·발송."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import VAPID_PUBLIC_KEY
from app.services import push_service

router = APIRouter(prefix="/api/push", tags=["push"])

# 시연용 알림 문구(여름 전 선제 점검 → 수요 분산)
DEMO_TITLE = "여름 오기 전, 에어컨 점검하세요"
DEMO_BODY = "올 여름 더 더워지기 전에 미리 셀프 점검하고 시원하게 준비해요"
DEMO_URL = "/diagnose"


class SubKeys(BaseModel):
    p256dh: str
    auth: str


class Subscription(BaseModel):
    endpoint: str
    keys: SubKeys


@router.get("/public-key")
def public_key():
    """프론트가 구독 시 쓰는 VAPID 공개키 + 활성 여부."""
    return {"public_key": VAPID_PUBLIC_KEY, "enabled": push_service.enabled()}


@router.post("/subscribe")
def subscribe(sub: Subscription):
    try:
        push_service.save_subscription(sub.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "count": push_service.count()}


def _send_demo():
    return push_service.send_to_all(DEMO_TITLE, DEMO_BODY, DEMO_URL)


# 데모 발송 — 버튼(POST)·간편 트리거(GET) 모두 지원
@router.post("/send-demo")
def send_demo_post():
    return _send_demo()


@router.get("/send-demo")
def send_demo_get():
    return _send_demo()
