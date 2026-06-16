"""웹 푸시(VAPID) — 여름 전 '에어컨 점검' 선제 알림.

구독은 push_subscription 테이블에 저장, pywebpush로 VAPID 서명해 발송.
VAPID 미설정/패키지 부재 시 비활성(엔드포인트는 에러 대신 안내 반환).
"""
import json

from sqlalchemy import text

from app.config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT
from app.db.connection import engine

try:
    from pywebpush import webpush, WebPushException
except Exception:                       # 패키지 부재 → 비활성
    webpush = None

    class WebPushException(Exception):   # 폴백 타입
        pass


def enabled() -> bool:
    return bool(webpush and VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)


def save_subscription(sub: dict) -> None:
    endpoint = sub.get("endpoint")
    keys = sub.get("keys") or {}
    p256dh, auth = keys.get("p256dh"), keys.get("auth")
    if not (endpoint and p256dh and auth):
        raise ValueError("invalid subscription")
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO push_subscription (endpoint, p256dh, auth)
            VALUES (:e, :p, :a)
            ON CONFLICT (endpoint) DO UPDATE SET p256dh = :p, auth = :a
        """), {"e": endpoint, "p": p256dh, "a": auth})
        conn.commit()


def count() -> int:
    with engine.connect() as conn:
        return conn.execute(text("SELECT COUNT(*) FROM push_subscription")).scalar() or 0


def _all() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT endpoint, p256dh, auth FROM push_subscription")).fetchall()
    return [{"endpoint": r[0], "keys": {"p256dh": r[1], "auth": r[2]}} for r in rows]


def _delete(endpoint: str) -> None:
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM push_subscription WHERE endpoint = :e"), {"e": endpoint})
        conn.commit()


def send_to_all(title: str, body: str, url: str = "/diagnose") -> dict:
    """저장된 모든 구독에 푸시. 만료(404/410) 구독은 정리."""
    if not enabled():
        return {"sent": 0, "failed": 0, "error": "push 비활성(VAPID 미설정)"}
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = failed = 0
    for sub in _all():
        try:
            webpush(
                subscription_info=sub, data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
            sent += 1
        except WebPushException as e:
            failed += 1
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status in (404, 410):
                _delete(sub["endpoint"])
        except Exception:
            failed += 1
    return {"sent": sent, "failed": failed}
