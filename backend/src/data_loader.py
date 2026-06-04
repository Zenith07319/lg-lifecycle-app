"""CSV 데이터 로더 — 모든 DataFrame 로딩 및 기본 조회 함수."""

from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"


def _load(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"데이터 파일이 없습니다: {path}")
    return pd.read_csv(path, encoding="utf-8-sig")


def load_tariff() -> pd.DataFrame:
    return _load("electricity_tariff.csv")


def load_device_spec() -> pd.DataFrame:
    return _load("device_energy_spec.csv")


def load_cost_reference() -> pd.DataFrame:
    return _load("cost_reference.csv")


def load_carbon_reference() -> pd.DataFrame:
    return _load("carbon_reference.csv")


def load_voc_patterns() -> pd.DataFrame:
    return _load("social_voc_pattern.csv")


def load_crawled_voc() -> pd.DataFrame:
    return _load("crawled_voc.csv")


def get_cost_ref(product_type: str, capacity_kw: float) -> dict:
    """용량에 가장 가까운 비용 기준 레코드 반환."""
    df = load_cost_reference()
    df = df[df["product_type"] == product_type].copy()
    if df.empty:
        return {}
    df["diff"] = (df["capacity_kw"] - capacity_kw).abs()
    row = df.sort_values("diff").iloc[0]
    return row.to_dict()


def get_device_spec(product_type: str, model_year: int, capacity_kw: float) -> dict:
    """연도·용량에 가장 가까운 에너지 스펙 레코드 반환.
    용량을 먼저 맞추고, 동일 용량 내에서 연식이 가장 가까운 레코드를 선택한다.
    """
    df = load_device_spec()
    df = df[df["product_type"] == product_type].copy()
    if df.empty:
        return {}
    # 1단계: 용량이 가장 가까운 값 찾기
    df["cap_diff"] = (df["capacity_kw"] - capacity_kw).abs()
    min_cap_diff = df["cap_diff"].min()
    # 2단계: 가장 가까운 용량의 레코드 중에서 연식이 가까운 것 선택
    candidates = df[df["cap_diff"] == min_cap_diff].copy()
    candidates["year_diff"] = (candidates["model_year"] - model_year).abs()
    row = candidates.sort_values("year_diff").iloc[0]
    return row.to_dict()


def get_new_device_spec(product_type: str, capacity_kw: float) -> dict:
    """신제품 에너지 스펙 반환 — 같은 용량 1등급 중 가장 효율적인(annual_kwh 최소) 모델 선택.

    LG 최신 고효율 1등급 가전과 비교하는 것이 교체 메리트를 가장 정확하게 반영한다.
    """
    df = load_device_spec()
    df = df[df["product_type"] == product_type].copy()
    if df.empty:
        return {}
    df = df[df["energy_grade"] == "1등급"].copy()
    # 1단계: 가장 가까운 용량 선택
    df["cap_diff"] = (df["capacity_kw"] - capacity_kw).abs()
    min_cap_diff   = df["cap_diff"].min()
    candidates     = df[df["cap_diff"] == min_cap_diff].copy()
    # 2단계: 같은 용량 중 annual_kwh 최솟값 선택 (= 가장 효율적인 고효율 모델)
    row = candidates.sort_values("annual_kwh").iloc[0]
    return row.to_dict()


def get_carbon_ref(product_type: str) -> dict:
    df = load_carbon_reference()
    rows = df[df["product_type"] == product_type]
    if rows.empty:
        return {}
    return rows.iloc[0].to_dict()


_SYMPTOM_TO_VOC_TYPE = {
    "냉방약화":   "performance_decline",
    "냄새":       "odor_hygiene",
    "전기료부담": "energy_cost_burden",
    "소음":       "noise_vibration",
    "누수":       "performance_decline",
    "작동불가":   "performance_decline",
}


def get_voc_risk_score(product_type: str, symptom_type: str) -> float:
    """증상 유형에 맞는 VOC 위험도 점수 반환 (0~1).

    social_voc_pattern.csv 기반. 매핑 실패 시 기본값 0.50 반환.
    이상없음은 0.20 고정.
    """
    if symptom_type == "이상없음":
        return 0.20
    voc_type = _SYMPTOM_TO_VOC_TYPE.get(symptom_type)
    if not voc_type:
        return 0.50
    try:
        df = _load("social_voc_pattern.csv")
        row = df[
            (df["product_type"] == product_type) &
            (df["symptom_type"] == voc_type)
        ]
        if not row.empty:
            return float(row["voc_risk_score"].iloc[0])
    except Exception:
        pass
    return 0.50
