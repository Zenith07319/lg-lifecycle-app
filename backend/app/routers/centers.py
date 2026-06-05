"""서비스센터 — 팀 수집 'LG전자 전국 서비스센터'(2025) + 카카오 지오코딩 좌표.

- 지역 조회: ?region=서울
- 내 위치 기반: ?lat=..&lng=.. → 가까운 순 정렬(거리 km 포함)
"""
import csv
import math
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["centers"])

_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "lg_service_centers.csv"
TEL = "1544-7777"
HOURS = "평일 09:00–18:00 · 토 09:00–13:00"
RESERVE_URL = "https://www.lge.co.kr/support/repair-and-engineer-visit"
_ORDER = ["서울", "경기", "인천", "대전/세종", "충청", "강원", "대구", "경북",
          "부산", "울산", "경남", "광주", "전라", "제주"]


def _load() -> list[dict]:
    with open(_CSV, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _haversine(a_lat, a_lng, b_lat, b_lng) -> float:
    R = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _item(r, dist=None):
    it = {
        "name":    r["name"],
        "region":  r["region"],
        "address": r["address"],
        "repair":  r.get("repair", ""),
        "note":    r.get("note", ""),
        "lat":     float(r["lat"]) if r.get("lat") else None,
        "lng":     float(r["lng"]) if r.get("lng") else None,
    }
    if dist is not None:
        it["distance_km"] = round(dist, 1)
    return it


@router.get("/centers")
def list_centers(region: str = "", lat: float | None = None,
                 lng: float | None = None, limit: int = 10):
    rows = _load()
    regions = sorted({r["region"] for r in rows if r["region"]},
                     key=lambda x: (_ORDER.index(x) if x in _ORDER else 99, x))

    # 내 위치 기반(가까운 순)
    if lat is not None and lng is not None:
        scored = [(_haversine(lat, lng, float(r["lat"]), float(r["lng"])), r)
                  for r in rows if r.get("lat")]
        scored.sort(key=lambda t: t[0])
        items = [_item(r, d) for d, r in scored[:limit]]
        return {"regions": regions, "selected": "내 주변", "mode": "nearby",
                "count": len(items), "tel": TEL, "hours": HOURS,
                "reserve_url": RESERVE_URL, "items": items}

    # 지역 조회
    sel = region or (regions[0] if regions else "")
    items = [_item(r) for r in rows if r["region"] == sel]
    return {"regions": regions, "selected": sel, "mode": "region",
            "count": len(items), "tel": TEL, "hours": HOURS,
            "reserve_url": RESERVE_URL, "items": items}
