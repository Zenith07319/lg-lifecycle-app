"""추천 제품 — 큐레이션 LG 카탈로그(CSV)에서 용량에 맞는 모델 반환.

실시간 가격 API 대신 스냅샷 참고가 + 정확한 LG 제품 상세 딥링크 제공.
(가격·재고·프로모션 실시간은 딥링크로 LG.com에 위임)
"""
import csv
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["products"])

_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "lg_aircon_catalog.csv"


def _load() -> list[dict]:
    with open(_CSV, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


@router.get("/products")
def list_products(capacity_kw: float, kind: str = "buy"):
    """용량에 가장 가까운 kind(buy/sub) 모델 목록."""
    rows = [r for r in _load() if r["type"] == kind]
    if not rows:
        return {"capacity_kw": capacity_kw, "kind": kind, "items": []}
    # 가장 가까운 용량으로 스냅
    caps = {float(r["capacity_kw"]) for r in rows}
    target = min(caps, key=lambda c: abs(c - capacity_kw))
    items = []
    for r in rows:
        if float(r["capacity_kw"]) != target:
            continue
        items.append({
            "model_name":   r["model_name"],
            "model_code":   r["model_code"],
            "energy_grade": int(r["energy_grade"]),
            "area_pyeong":  int(r["area_pyeong"]),
            "price":        int(r["price"]) if r["price"] else None,
            "monthly_fee":  int(r["monthly_fee"]) if r["monthly_fee"] else None,
            "product_url":  r["product_url"],
            "tag":          r.get("tag", ""),
            "capacity_kw":  target,
        })
    return {"capacity_kw": target, "kind": kind, "items": items}
