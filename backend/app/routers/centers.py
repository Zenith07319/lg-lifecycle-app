"""서비스센터 — 팀 수집 'LG전자 전국 서비스센터'(2025) CSV에서 지역별 조회."""
import csv
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["centers"])

_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "lg_service_centers.csv"
TEL = "1544-7777"
HOURS = "평일 09:00–18:00 · 토 09:00–13:00"
RESERVE_URL = "https://www.lge.co.kr/support/repair-and-engineer-visit"
# 지역 표시 순서(수도권 우선)
_ORDER = ["서울", "경기", "인천", "대전/세종", "충청", "강원", "대구", "경북",
          "부산", "울산", "경남", "광주", "전라", "제주"]


def _load() -> list[dict]:
    with open(_CSV, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


@router.get("/centers")
def list_centers(region: str = ""):
    rows = _load()
    regions = sorted({r["region"] for r in rows if r["region"]},
                     key=lambda x: (_ORDER.index(x) if x in _ORDER else 99, x))
    sel = region or (regions[0] if regions else "")
    items = [{
        "name":    r["name"],
        "region":  r["region"],
        "address": r["address"],
        "repair":  r.get("repair", ""),
        "note":    r.get("note", ""),
    } for r in rows if r["region"] == sel]
    return {
        "regions": regions, "selected": sel, "count": len(items),
        "tel": TEL, "hours": HOURS, "reserve_url": RESERVE_URL,
        "items": items,
    }
