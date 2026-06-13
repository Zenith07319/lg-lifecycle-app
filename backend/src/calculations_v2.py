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

# ── v4.1 전력 통일 앵커 (docs/04g) ───────────────────────────────────
# 증상 → 전력증가 대역(%): MDPI Data 2024 9(9):106 실측 (baseline 1210.1W 대비)
SYMPTOM_BAND = {
    "이상없음":  (0.0, 0.0),
    "냄새":      (2.41, 5.76),
    "전기료부담": (2.41, 8.33),
    "소음":      (5.76, 13.41),
    "냉방약화":  (9.98, 24.77),
    "작동불가":  (24.77, 36.52),
    # 누수는 전력 대역 없음(안전 이슈) — 점검필요도 floor 0.55로 별도 처리
}
# 증상별 가역비율: 셀프케어(청소)로 회복되는 몫. 나머지는 수리(영구·부품) 영역. [E5 가안]
REV_FRAC = {
    "이상없음": 0.0, "냄새": 1.0, "전기료부담": 0.7, "소음": 0.2,
    "냉방약화": 0.6, "작동불가": 0.0, "누수": 0.0,
}
R_AGE_YR = 1.5            # 연식 영구열화 %/년 (FSEC 2018 분해: 5.2 median 중 영구분)
R_AGE_MAX = 25.0          # = 1.5 × 16.7년(기대수명 앵커)
FILTER_MAX_PCT = 2.41     # 필터 50% 막힘 전력증가(MDPI FI50)
EFF_FLOOR = 0.635         # 1 - 0.3652 (MDPI 실측 최대 고장 증가율)
P_TOTAL_MAX = 36.52 + R_AGE_MAX + FILTER_MAX_PCT   # 63.93 — 점검필요도 1.0 도달 앵커


def symptom_power_pct(symptom_type: str, severity) -> float:
    """증상 → 전력증가율(%). 심각도 1~5 선형 보간."""
    lo, hi = SYMPTOM_BAND.get(symptom_type, (0.0, 0.0))
    sev = int(severity) if isinstance(severity, (int, float)) else 1
    return lo + (hi - lo) * (max(sev, 1) - 1) / 4


# ── 복수 증상 전력 합산 (docs/04h) ───────────────────────────────────
# 선택된 모든 증상의 MDPI 전력증가율을 합산하되, 최대 증상은 가중치 1.0,
# 추가 증상은 0.8(중복보정)로 더한다. 단일 증상이면 기존 결과와 100% 동일.
MULTI_SYMPTOM_FACTOR = 0.8

def aggregate_symptom_power(symptoms) -> tuple:
    """[(증상키, 심각도1~5)] → (전력증가율 합%, 셀프케어 잔여%).

    sym_self = 셀프케어(청소)로도 안 빠지는 잔여 전력증가(Σ w·p·(1-rev)).
    최대 증상은 w=1.0, 그 외 추가 증상은 w=0.8(중복보정).
    """
    items = []
    for t, s in (symptoms or []):
        p = symptom_power_pct(t, s)
        if p <= 0:
            continue
        rev = REV_FRAC.get(t, 0.0)
        items.append((p, p * (1.0 - rev)))
    # 결정성: 전력% 동점이면 p_self(=가역성 낮은) 큰 쪽을 먼저 → 입력 순서 무관·보수적
    items.sort(key=lambda x: (x[0], x[1]), reverse=True)
    sym_total = sym_self = 0.0
    for i, (p, p_self) in enumerate(items):
        w = 1.0 if i == 0 else MULTI_SYMPTOM_FACTOR
        sym_total += w * p
        sym_self  += w * p_self
    return sym_total, sym_self


def power_excess_decomp(age_years: int, symptoms, filter_clean_months: int) -> dict:
    """전력 과소비 분해 → 영구/가역 효율 (docs/04g §2-2 · 04h 복수증상 합산).

    symptoms: [(증상키, 심각도1~5)] 선택 증상 전체. 복수면 전력대역 합산(중복보정 0.8).
    과소비% = 영구열화(연식 1.5%/년) + 가역열화(증상 MDPI 합산 + 필터)
    옵션별 시작효율: 계속/셀프(가역 일부 회복)/수리(영구만).
    """
    perm = min(R_AGE_YR * age_years, R_AGE_MAX)
    sym, sym_self = aggregate_symptom_power(symptoms)
    fil  = min(filter_clean_months / 12, 1.0) * FILTER_MAX_PCT
    rev  = (sym - sym_self) / sym if sym > 0 else 0.0        # 전력가중 유효 가역비율
    block = perm + sym + fil
    ce      = 1.0 / (1 + block / 100)                       # 계속(현 상태)
    ce_self = 1.0 / (1 + (perm + sym_self) / 100)           # 셀프(가역증상+필터 제거)
    ce_rep  = 1.0 / (1 + perm / 100)                        # 수리(증상·필터 전량 해소)
    sc_eff = (sym - sym_self + fil) / block if block > 0 else 0.0
    rp_eff = (sym + fil) / block if block > 0 else 0.0
    return {
        "perm": perm, "sym": sym, "fil": fil, "rev": round(rev, 3),
        "ce": max(ce, EFF_FLOOR), "ce_self": max(ce_self, EFF_FLOOR),
        "ce_rep": max(ce_rep, EFF_FLOOR),
        "sc_eff": round(sc_eff, 3), "rp_eff": round(rp_eff, 3),
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

SEVERITY_MULTIPLIER = {
    "없음": 0.1, "낮음": 0.6, "중간": 1.0, "높음": 1.4,   # 레거시 4단계(하위호환)
    1: 0.1, 2: 0.6, 3: 1.0, 4: 1.4, 5: 1.8,               # 1~5점 척도 (5점=1.8 잠정, PROJECT.md §8 미확정)
}


# ── 벽걸이 / 스탠드 추정 (docs/04i) ───────────────────────────────────
# 근거: LG 에어컨 카탈로그 132개(벽걸이 26·스탠드 106) 냉방용량 분포 분석.
#   벽걸이 2.3~6.5kW(중앙 3.6) / 스탠드 6.5~9.0kW(중앙 7.2) — 임계 5.5kW로 97.7% 분리.
# 월간소비전력량(라벨)은 용량과 상관 0.71 → 용량 미입력·애매구간(4.5~6.5kW)의 보조 신호로만 사용.
FORM_CAP_THRESHOLD = 5.5      # kW. 이상=스탠드, 미만=벽걸이 (1차 기준)
FORM_CAP_AMBIG = (4.5, 6.5)   # 이 구간은 애매 → 월간소비전력량으로 보조 판정
FORM_KWH_STAND_MIN = 180      # 라벨 월간소비전력량 이 이상이면 스탠드 가중
FORM_KWH_WALL_MAX = 110       # 이 이하면 벽걸이 가중
FORM_KWH_ONLY_THRESHOLD = 150 # 용량 미입력 시 월간소비전력량 단독 임계


def classify_form(capacity_kw: float, monthly_kwh: float = 0) -> tuple[str, str]:
    """냉방용량(+월간소비전력량 라벨)으로 벽걸이/스탠드 추정.

    1차: 냉방용량 임계 5.5kW (카탈로그 97.7% 분리).
    2차(보조): 용량 4.5~6.5kW 애매구간에서 월간소비전력량이 명확하면 보정.
    용량 미입력 시: 월간소비전력량 단독 추정.
    반환: (form, confidence) — confidence ∈ {"high","medium","low"}.
    """
    cap = capacity_kw or 0
    kwh = monthly_kwh or 0
    if cap > 0:
        form = "스탠드" if cap >= FORM_CAP_THRESHOLD else "벽걸이"
        if FORM_CAP_AMBIG[0] <= cap <= FORM_CAP_AMBIG[1]:   # 애매구간
            if kwh >= FORM_KWH_STAND_MIN:
                return "스탠드", "medium"
            if 0 < kwh <= FORM_KWH_WALL_MAX:
                return "벽걸이", "medium"
            return form, "medium"
        return form, "high"
    if kwh > 0:                                              # 용량 없음 → kWh 단독
        return ("스탠드" if kwh >= FORM_KWH_ONLY_THRESHOLD else "벽걸이"), "low"
    return "벽걸이", "low"                                   # 정보 없음 → 최빈값(벽걸이)

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
    symptoms,
    filter_clean_months: int,
    repair_history_count: int,
    voc_risk_score: float = 0.50,
) -> float:
    """점검 필요도 (0~1) — v4.1 전력 통일 (docs/04g §2-1 · 04h 복수증상 합산).

    고장 확률이 아니라 입력 조건이 시사하는 전력 열화 수준 기반 점검 필요도.
    연식 1.5%(영구) + 증상 MDPI 합산 + 필터를 전력(%)로 통일 후 합산.
    복합보정 0.8(증상·필터 동시), 수리·VOC는 증상블록 배율(연식 미증폭).
    """
    sym, _ = aggregate_symptom_power(symptoms)                       # 복수 증상 전력증가 합 %
    age = min(age_score * 25.05, R_AGE_MAX)                          # = 1.5%/년 × 연식(상한 25%)
    fil = min(filter_clean_months / 12, 1.0) * FILTER_MAX_PCT
    # 복합보정: 증상·필터 동시 발생은 부분가산(MDPI 복합/단독 평균 0.76)
    sf = (sym + fil) * 0.8 if (sym > 0 and fil > 0) else (sym + fil)
    # 배율(전력 환산 불가 요인) — 증상·필터 블록에만 적용(연식은 증폭 안 함)
    m_repair = 1.0 + 0.1 * min(repair_history_count, 3)              # 1.0 ~ 1.3
    m_voc    = 1.0 + 0.3 * voc_risk_score                            # 1.0 ~ 1.3
    power_block = min((sf * m_repair * m_voc + age) / P_TOTAL_MAX, 1.0)
    score = power_block
    if any(t == "누수" for t, _ in (symptoms or [])):                # 누수 안전 이슈 하한
        score = max(score, 0.55)
    return round(min(score, 1.0), 3)


def calculate_inconvenience(
    symptoms,
    age_score: float,
) -> float:
    """생활불편도 (0~1). 복수 증상은 불편도 합산(최대 1.0, 추가증상 0.8 가중) — 04h.

    단일 증상이면 기존(base×심각도배율 + 연식보너스)과 동일.
    """
    vals = []
    for t, s in (symptoms or []):
        v = SYMPTOM_INCONVENIENCE_MAP.get(t, 0.0) * SEVERITY_MULTIPLIER.get(s, 1.0)
        if v > 0:
            vals.append(v)
    vals.sort(reverse=True)
    agg = 0.0
    for i, v in enumerate(vals):
        agg += (1.0 if i == 0 else MULTI_SYMPTOM_FACTOR) * v
    age_bonus = age_score * 0.10
    return round(min(agg + age_bonus, 1.0), 3)


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
    symptoms,
    filter_clean_months: int,
    repair_history_count: int,
    old_annual_kwh: float,
    new_annual_kwh: float,
    voc_risk_score: float = 0.50,
) -> DiagnosisResultV2:
    """symptoms: [(증상키, 심각도1~5)] 선택 증상 전체. 복수면 전력·불편 합산(04h)."""
    age, age_score = calculate_age_score(purchase_year, product_type)
    inspection = calculate_inspection_score(
        age_score, symptoms,
        filter_clean_months, repair_history_count, voc_risk_score,
    )
    inconvenience = calculate_inconvenience(symptoms, age_score)
    # 낭비비율 ②안 (docs/04g): 신품 자기대비 추가 낭비 = 1/η − 1 (현재효율 기반).
    #   "건강" = 내 기기가 신품 대비 얼마나 새는가. 신형 대비 격차는 비용층(교체 편익)에서만.
    decomp = power_excess_decomp(age, symptoms, filter_clean_months)
    waste_ratio = round(1.0 / decomp["ce"] - 1.0, 3)
    waste_kwh = round(old_annual_kwh * (1.0 - decomp["ce"]), 1)
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
