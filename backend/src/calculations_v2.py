"""
상태 진단 계산 모듈 v2
- 고장위험도 → 점검 필요도(inspection_score)로 변경
- 가중치: 연식 0.30 / 증상 0.30 / 수리이력 0.20 / 관리미이행 0.10 / VOC 0.10
- 기대수명: 에어컨 16.7년 (KESIS HEPS 역산. 2026-06-04. 구 15년에서 변경)
- 모든 수치는 현재 입력 조건 기준 추정 — 정확한 고장 예측 아님
"""

from dataclasses import dataclass


# 제품별 기대수명(년) — 연식점수 정규화 분모. 연식점수 = min(사용연수 / 기대수명, 1.0)
# 에어컨 16.7년: KESIS 가구에너지패널조사(HEPS 13차, 2022년 기준) '에어컨 신규구매율' 역산값.
#   평균 신규구매율 5.99%(2019~2022) → 단순 역산 구매주기 = 100 / 5.99 ≈ 16.7년.
#   (산출·출처 상세: docs/04_calculation_logic.md §1-1, docs/05_data_requirements.md §10)
# 냉장고/세탁기/건조기는 역산값이 과대(예: 냉장고 28.9년)하여 미적용, 공학적 기대수명 유지.
PRODUCT_EXPECTED_LIFE = {
    "에어컨": 16.7,
    "냉장고": 15,
    "세탁기": 12,
    "건조기": 12,
}

SYMPTOM_RISK_MAP = {
    "이상없음":  0.00,
    "냄새":      0.25,
    "전기료부담": 0.15,
    "소음":      0.45,
    "냉방약화":  0.50,
    "누수":      0.70,
    "작동불가":  0.90,
}

SYMPTOM_INCONVENIENCE_MAP = {
    "이상없음":  0.00,
    "냄새":      0.45,
    "전기료부담": 0.30,
    "소음":      0.40,
    "냉방약화":  0.65,
    "누수":      0.60,
    "작동불가":  0.95,
}

SEVERITY_MULTIPLIER = {"없음": 0.1, "낮음": 0.6, "중간": 1.0, "높음": 1.4}

FILTER_SCORE_PER_MONTH = 0.10   # 월당 0.10, max 1.0 (10개월이면 상한)


@dataclass
class DiagnosisResultV2:
    age_years: int
    age_score: float             # 0~1, 높을수록 노후
    inspection_score: float      # 0~1, 점검 필요도 (고장 확률 아님)
    inspection_score_100: float  # 0~100 점수
    inconvenience: float         # 0~1
    energy_waste_ratio: float    # 신제품 대비 초과 소비 비율
    energy_waste_kwh_annual: float
    health_grade: str            # A~E
    health_score: float          # 0~100 (높을수록 건강)
    grade_description: str


def calculate_age_score(purchase_year: int, product_type: str = "에어컨") -> tuple[int, float]:
    from datetime import date
    current_year = date.today().year
    age = current_year - purchase_year
    expected_life = PRODUCT_EXPECTED_LIFE.get(product_type, 12)
    score = min(age / expected_life, 1.0)
    return age, round(score, 3)


def calculate_inspection_score(
    age_score: float,
    symptom_type: str,
    symptom_severity: str,
    filter_clean_months: int,
    repair_history_count: int,
    voc_risk_score: float = 0.50,
) -> float:
    """점검 필요도 (0~1).

    고장 확률이 아니라 입력 조건 기준의 점검 필요도를 점수화한다.
    가중치: 연식 0.30 / 증상 0.30 / 수리이력 0.15 / 관리미이행 0.15 / VOC 0.10
    """
    # 연식 점수 (이미 0~1)
    w_age = age_score * 0.30

    # 증상 심각도 점수 (0~1)
    symptom_base = SYMPTOM_RISK_MAP.get(symptom_type, 0.0)
    severity_mult = SEVERITY_MULTIPLIER.get(symptom_severity, 1.0)
    w_symptom = symptom_base * severity_mult * 0.30

    # 수리 이력 점수 (회당 0.33, max 1.0) — 가중치 0.20→0.15
    repair_score = min(repair_history_count * 0.33, 1.0)
    w_repair = repair_score * 0.15

    # 관리 미이행 점수 (필터 미청소 월수: 월당 0.10, max 1.0) — 가중치 0.10→0.15
    filter_score = min(filter_clean_months * FILTER_SCORE_PER_MONTH, 1.0)
    w_filter = filter_score * 0.15

    # VOC 위험도 (소셜 데이터 기반 동일 증상 빈도, 0~1)
    w_voc = voc_risk_score * 0.10

    score = w_age + w_symptom + w_repair + w_filter + w_voc
    return round(min(score, 1.0), 3)


def calculate_inconvenience(
    symptom_type: str,
    symptom_severity: str,
    age_score: float,
) -> float:
    """생활불편도 (0~1)."""
    base = SYMPTOM_INCONVENIENCE_MAP.get(symptom_type, 0.0)
    severity_mult = SEVERITY_MULTIPLIER.get(symptom_severity, 1.0)
    age_bonus = age_score * 0.10
    return round(min(base * severity_mult + age_bonus, 1.0), 3)


def calculate_energy_waste_ratio(
    old_annual_kwh: float,
    new_annual_kwh: float,
) -> tuple[float, float]:
    """에너지 낭비 비율 및 낭비 kWh (연간) 계산."""
    if new_annual_kwh <= 0:
        return 0.0, 0.0
    waste_kwh = max(old_annual_kwh - new_annual_kwh, 0.0)
    waste_ratio = waste_kwh / new_annual_kwh
    return round(waste_ratio, 3), round(waste_kwh, 1)


def assign_health_grade(
    inspection_score: float,
    energy_waste_ratio: float,
    inconvenience: float,
) -> tuple[str, float, str]:
    """가전 건강등급 (A~E) 및 건강점수 (0~100)."""
    raw = (inspection_score * 0.45 + energy_waste_ratio * 0.30 + inconvenience * 0.25)
    health_score = max(0.0, 100.0 - raw * 100.0)

    if health_score >= 80:
        grade, desc = "A", "계속 사용 적합 — 현재 상태 양호"
    elif health_score >= 65:
        grade, desc = "B", "셀프케어 권장 — 관리 후 사용 가능"
    elif health_score >= 50:
        grade, desc = "C", "점검 권장 — 수리 또는 정밀 진단 필요"
    elif health_score >= 35:
        grade, desc = "D", "구독·교체 검토 — 점검 필요도 상승 중"
    else:
        grade, desc = "E", "점검 필요도 높음 — 즉시 점검 또는 교체 권장"

    return grade, round(health_score, 1), desc


def run_diagnosis(
    purchase_year: int,
    product_type: str,
    symptom_type: str,
    symptom_severity: str,
    filter_clean_months: int,
    repair_history_count: int,
    old_annual_kwh: float,
    new_annual_kwh: float,
    voc_risk_score: float = 0.50,
) -> DiagnosisResultV2:
    age, age_score = calculate_age_score(purchase_year, product_type)
    inspection = calculate_inspection_score(
        age_score, symptom_type, symptom_severity,
        filter_clean_months, repair_history_count, voc_risk_score,
    )
    inconvenience = calculate_inconvenience(symptom_type, symptom_severity, age_score)
    waste_ratio, waste_kwh = calculate_energy_waste_ratio(old_annual_kwh, new_annual_kwh)
    grade, health_score, grade_desc = assign_health_grade(inspection, waste_ratio, inconvenience)

    return DiagnosisResultV2(
        age_years=age,
        age_score=age_score,
        inspection_score=inspection,
        inspection_score_100=round(inspection * 100, 1),
        inconvenience=inconvenience,
        energy_waste_ratio=waste_ratio,
        energy_waste_kwh_annual=waste_kwh,
        health_grade=grade,
        health_score=health_score,
        grade_description=grade_desc,
    )
