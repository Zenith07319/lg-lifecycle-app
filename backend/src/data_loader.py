"""DB-backed data loader — repositories.py 에서 주로 사용, CSV fallback 포함."""
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"

def _load(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename
    return pd.read_csv(path, encoding="utf-8-sig")

_SYMPTOM_TO_VOC_TYPE = {
    "냉방약화":   "performance_decline",
    "냄새":       "odor_hygiene",
    "전기료부담": "energy_cost_burden",
    "소음":       "noise_vibration",
    "누수":       "performance_decline",
    "작동불가":   "performance_decline",
}

def get_cost_ref(product_type: str, capacity_kw: float) -> dict:
    df = _load("cost_reference.csv")
    df = df[df["product_type"] == product_type].copy()
    if df.empty:
        return {}
    df["diff"] = (df["capacity_kw"] - capacity_kw).abs()
    return df.sort_values("diff").iloc[0].to_dict()

def get_device_spec(product_type: str, model_year: int, capacity_kw: float) -> dict:
    df = _load("device_energy_spec.csv")
    df = df[df["product_type"] == product_type].copy()
    if df.empty:
        return {}
    df["score"] = (df["model_year"] - model_year).abs() * 2 + (df["capacity_kw"] - capacity_kw).abs()
    return df.sort_values("score").iloc[0].to_dict()

def get_new_device_spec(product_type: str, capacity_kw: float) -> dict:
    df = _load("device_energy_spec.csv")
    df = df[(df["product_type"] == product_type) & (df["energy_grade"] == "1등급")].copy()
    if df.empty:
        return {}
    df["diff"] = (df["capacity_kw"] - capacity_kw).abs()
    return df.sort_values("diff").iloc[0].to_dict()

def get_carbon_ref(product_type: str) -> dict:
    df = _load("carbon_reference.csv")
    rows = df[df["product_type"] == product_type]
    return rows.iloc[0].to_dict() if not rows.empty else {}

def get_voc_risk_score(product_type: str, symptom_type: str) -> float:
    if symptom_type == "이상없음":
        return 0.20
    voc_type = _SYMPTOM_TO_VOC_TYPE.get(symptom_type)
    if not voc_type:
        return 0.50
    try:
        df = _load("social_voc_pattern.csv")
        row = df[(df["product_type"] == product_type) & (df["symptom_type"] == voc_type)]
        if not row.empty:
            return float(row["voc_risk_score"].iloc[0])
    except Exception:
        pass
    return 0.50
