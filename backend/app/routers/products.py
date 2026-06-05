"""추천 제품 — 실제 LG 카탈로그(CSV)에서 용량에 가까운 모델 반환.

데이터: 팀 수집 'LG 모델별 기본사양(268)' × '정가/판매가/구독 가격비교' 조인 결과.
용량(냉방능력 kW)에 가장 가까운 모델을 가격순으로 반환. 실시간 가격은 딥링크로 LG.com 위임.
"""
import csv
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["products"])

_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "lg_aircon_catalog.csv"


def _load() -> list[dict]:
    with open(_CSV, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _int(v):
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


@router.get("/products")
def list_products(capacity_kw: float, kind: str = "buy", limit: int = 6):
    """용량(냉방능력 kW)에 가까운 kind(buy/sub) 모델을 가격순으로."""
    items = []
    for r in _load():
        cap = float(r["capacity_kw"])
        if kind == "sub":
            fee = _int(r.get("monthly_fee"))
            url = r.get("sub_url", "")
            if not fee or not url:      # 구독 미제공 모델 제외
                continue
            price = None
        else:
            price = _int(r.get("sale_price"))
            url = r.get("buy_url", "")
            if not url:
                continue
        items.append({
            "model_code":  r["model_code"],
            "model_name":  r["model_name"],
            "capacity_kw": cap,
            "form":        r.get("form", ""),
            "price":       price,
            "list_price":  _int(r.get("list_price")),
            "monthly_fee": _int(r.get("monthly_fee")),
            "product_url": url,
        })
    sort_key = "monthly_fee" if kind == "sub" else "price"
    # 용량 근접 → 가격 오름차순
    items.sort(key=lambda x: (abs(x["capacity_kw"] - capacity_kw),
                              x[sort_key] if x[sort_key] is not None else 9 ** 9))
    return {"capacity_kw": capacity_kw, "kind": kind, "items": items[:limit]}
