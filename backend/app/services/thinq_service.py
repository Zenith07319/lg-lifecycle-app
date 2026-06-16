"""LG ThinQ Open API 연동 — 설문 시작 시 '내 에어컨 자동 불러오기'.

공식 패키지 thinqconnect 사용. ThinQ는 모델·필터(usedTime)만 제공하고
냉방능력·월간소비전력량·구매연식은 주지 않으므로 data/thinq_device_spec.json 시드로 보완한다.
PAT 미설정/호출 실패/패키지 부재 시 mock 기기로 폴백(OCR 엔드포인트와 동일 패턴).
실시간 상태(필터 usedTime)는 기기가 online일 때만 조회되므로 오프라인이면 filter는 None.
"""
import json
from functools import lru_cache
from pathlib import Path

from aiohttp import ClientSession

from app.config import THINQ_PAT, THINQ_CLIENT_ID, THINQ_COUNTRY

try:
    from thinqconnect import ThinQApi
except Exception:                       # 패키지 미설치 등 → mock 강제
    ThinQApi = None

_SPEC = Path(__file__).resolve().parent.parent.parent / "data" / "thinq_device_spec.json"

# PAT 미설정/오프라인/실패 시 데모용 mock 기기(메모리 실측 모델)
_MOCK_DEVICE = {"device_id": "mock-ac-cst570004", "alias": "거실에어컨", "model_name": "CST_570004_WW"}


@lru_cache(maxsize=1)
def _spec_map() -> dict:
    try:
        return json.loads(_SPEC.read_text(encoding="utf-8")).get("models", {})
    except Exception:
        return {}


def _enabled() -> bool:
    return bool(ThinQApi and THINQ_PAT and THINQ_CLIENT_ID)


def _api(session: ClientSession):
    return ThinQApi(session=session, access_token=THINQ_PAT,
                    country_code=THINQ_COUNTRY, client_id=THINQ_CLIENT_ID)


def _filter_months_from_state(state: dict):
    """ThinQ state의 filterInfo(usedTime/filterLifetime) → filter_clean_months 버킷 근사.

    usedTime은 누적 필터 사용시간이라 '청소 후 경과 개월'과 단위가 달라, 사용률(%)을
    설문 버킷(1/2/5/24개월)에 매핑한다(보조 신호).
    """
    fi = (state or {}).get("filterInfo") or {}
    used, life = fi.get("usedTime"), fi.get("filterLifetime")
    if not used or not life or life <= 0:
        return None
    pct = used / life
    if pct < 0.25:
        return 1
    if pct < 0.50:
        return 2
    if pct < 0.75:
        return 5
    return 24


def _build_prefill(device_id, alias, model_name, filter_months, online, source) -> dict:
    spec = _spec_map().get(model_name, {})
    cap, kwh, year = spec.get("capacity_kw"), spec.get("monthly_kwh"), spec.get("purchase_year")
    return {
        "device_id": device_id, "alias": alias, "model_name": model_name,
        "capacity_kw": cap, "ac_monthly_kwh": kwh, "purchase_year": year,
        "filter_months": filter_months, "online": online, "source": source,
        "spec_label": spec.get("label", ""),
        "resolved": {
            "capacity": cap is not None, "kwh": kwh is not None,
            "year": year is not None, "filter": filter_months is not None,
        },
    }


def _mock_prefill() -> dict:
    m = _MOCK_DEVICE
    return _build_prefill(m["device_id"], m["alias"], m["model_name"], None, False, "mock")


async def list_ac_devices() -> dict:
    """등록된 에어컨 목록. 실패 시 mock 1대."""
    if not _enabled():
        return {"source": "mock", "items": [_MOCK_DEVICE]}
    try:
        async with ClientSession() as session:
            devices = await _api(session).async_get_device_list()
        items = [
            {"device_id": d.get("deviceId"),
             "alias": d.get("deviceInfo", {}).get("alias", "에어컨"),
             "model_name": d.get("deviceInfo", {}).get("modelName", "")}
            for d in (devices or [])
            if d.get("deviceInfo", {}).get("deviceType") == "DEVICE_AIR_CONDITIONER"
        ]
        return {"source": "thinq", "items": items}
    except Exception:
        return {"source": "mock", "items": [_MOCK_DEVICE]}


async def get_prefill(device_id: str) -> dict:
    """선택 기기 → 설문 프리필. 모델→시드(냉방능력·월소비전력·연식) + state→필터(온라인 시)."""
    if not _enabled():
        return _mock_prefill()
    try:
        async with ClientSession() as session:
            api = _api(session)
            devices = await api.async_get_device_list()
            dev = next((d for d in (devices or []) if d.get("deviceId") == device_id), None)
            if dev is None:
                return _mock_prefill()
            info = dev.get("deviceInfo", {})
            alias, model_name = info.get("alias", "에어컨"), info.get("modelName", "")
            filter_months, online = None, False
            try:                                    # 필터값은 기기 online일 때만
                state = await api.async_get_device_status(device_id)
                online, filter_months = True, _filter_months_from_state(state)
            except Exception:
                online = False
            return _build_prefill(device_id, alias, model_name, filter_months, online, "thinq")
    except Exception:
        return _mock_prefill()
