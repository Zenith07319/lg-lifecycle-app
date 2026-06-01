"""
의사결정 리포트 생성 모듈 v2
- "고장위험도" → "점검 필요도" 전면 교체
- "예측" → "추정 / 점검 필요도"
- 탄소 회수기간 포함
- Rule 3 (셀프케어 우선) 리포트 내 처리
"""

from dataclasses import dataclass, field
from src.calculations_v2 import DiagnosisResultV2
from src.scoring_v2 import OptionScoreV2, CarbonSummary


@dataclass
class DecisionReportV2:
    recommendation_1st: str
    recommendation_2nd: str
    reason_summary: str
    confidence_cards: list[str]
    caution_notes: list[str]
    next_actions: list[dict]
    as_fast_pass_text: str
    family_share_summary: str


CAUTION_TEMPLATES = {
    "점검필요도높음":  "⚠ 점검 필요도가 높은 상태입니다. 여름 시즌 전 점검을 권장합니다.",
    "수리비과다":      "⚠ 수리비가 신제품 가격 대비 높습니다. 수리 전 견적을 확인하세요.",
    "에너지낭비큼":    "⚠ 에너지 낭비가 상당합니다. 전기요금 누진구간 진입 여부를 확인하세요.",
    "탄소회수짧음":    "ℹ 교체 탄소 회수기간이 짧습니다. 교체 선택지도 탄소 기준 합리적입니다.",
    "탄소회수긺":      "ℹ 교체 탄소 회수기간이 깁니다. 수리·셀프케어가 탄소 기준 더 유리할 수 있습니다.",
    "셀프케어우선":    "ℹ 냄새·필터 미청소 증상이 확인됩니다. 셀프케어 후 재진단을 권장합니다.",
    "공식데이터기준":  "※ 모든 수치는 현재 입력 조건 기준 추정 결과이며, 정확한 고장 예측이 아닙니다.",
}

NEXT_ACTION_MAP = {
    "셀프케어":   {"label": "셀프케어 가이드 보기",   "action": "selfcare_guide",      "icon": "🔧"},
    "수리후사용": {"label": "A/S Fast Pass 초안 생성", "action": "as_fastpass",         "icon": "📋"},
    "구독전환":   {"label": "구독 상담 안내",          "action": "subscription_consult","icon": "📱"},
    "신제품구매": {"label": "신제품 구매 비교",         "action": "product_compare",     "icon": "🛒"},
    "계속사용":   {"label": "관리 루틴 가이드",         "action": "maintenance_guide",   "icon": "✅"},
    "소모품":     {"label": "D2C 소모품 보기",          "action": "d2c_parts",           "icon": "🛍"},
    "공유":       {"label": "가족 공유용 요약 복사",    "action": "share_summary",       "icon": "📤"},
}


def _build_confidence_cards(
    diagnosis: DiagnosisResultV2,
    user_inputs: dict,
    top_option: OptionScoreV2,
    carbon_summary: CarbonSummary,
) -> list[str]:
    cards = []
    expected_life = 15
    if diagnosis.age_years >= expected_life:
        cards.append(f"📅 {diagnosis.age_years}년 사용 — 에어컨 기대수명({expected_life}년) 이상 경과")
    elif diagnosis.age_years >= int(expected_life * 0.7):
        cards.append(f"📅 {diagnosis.age_years}년 사용 — 기대수명의 {int(diagnosis.age_score*100)}% 경과")

    symptom = user_inputs.get("symptom_type", "이상없음")
    severity = user_inputs.get("symptom_severity", "없음")
    if symptom != "이상없음":
        cards.append(f"⚠ 증상: {symptom} (심각도: {severity})")

    filter_months = user_inputs.get("filter_clean_months", 0)
    if filter_months >= 6:
        cards.append(f"🔍 필터 미청소 {filter_months}개월 — 냄새·냉방 성능 저하 가능성")

    repair_count = user_inputs.get("repair_history_count", 0)
    if repair_count >= 1:
        cards.append(f"🔩 최근 수리 이력 {repair_count}회 — 재발 가능성 주의")

    if diagnosis.energy_waste_ratio >= 0.30:
        cards.append(f"💡 신제품 대비 에너지 {diagnosis.energy_waste_ratio*100:.0f}% 더 소비 추정")

    # 점검 필요도 (고장 확률이 아님을 명시)
    score = diagnosis.inspection_score_100
    if score >= 60:
        cards.append(f"🔎 점검 필요도 {score:.0f}점 — 점검 또는 관리 조치 검토 (고장 확률 아님)")
    elif score < 30:
        cards.append(f"✅ 점검 필요도 {score:.0f}점 — 당장 교체 필요성 낮음")

    if carbon_summary.carbon_payback_years < 3:
        cards.append(
            f"🌿 교체 탄소 회수기간 {carbon_summary.carbon_payback_years:.1f}년 — 교체도 탄소 기준 합리적"
        )
    elif carbon_summary.carbon_payback_years >= 6:
        cards.append(
            f"🌿 교체 탄소 회수기간 {carbon_summary.carbon_payback_years:.1f}년 — "
            "수리·셀프케어가 탄소 기준 더 유리할 수 있음"
        )

    cards.append(f"📊 추천: {top_option.label} (현재 입력 조건 기준 추정)")
    return cards


def _build_caution_notes(
    diagnosis: DiagnosisResultV2,
    options: list[OptionScoreV2],
    user_inputs: dict,
    carbon_summary: CarbonSummary,
) -> list[str]:
    notes = []

    if diagnosis.inspection_score >= 0.65:
        notes.append(CAUTION_TEMPLATES["점검필요도높음"])

    repair_opt = next((o for o in options if o.key == "수리후사용"), None)
    buy_opt    = next((o for o in options if o.key == "신제품구매"), None)
    if repair_opt and buy_opt and repair_opt.initial_cost > buy_opt.initial_cost * 0.50:
        notes.append(CAUTION_TEMPLATES["수리비과다"])

    if diagnosis.energy_waste_ratio >= 0.35:
        notes.append(CAUTION_TEMPLATES["에너지낭비큼"])

    # Rule 3: 셀프케어 우선 경고
    symptom = user_inputs.get("symptom_type", "이상없음")
    filter_months = user_inputs.get("filter_clean_months", 0)
    if symptom in ("냄새",) and filter_months >= 6:
        notes.append(CAUTION_TEMPLATES["셀프케어우선"])
    elif symptom == "냉방약화" and filter_months >= 6 and diagnosis.inspection_score < 0.70:
        notes.append(CAUTION_TEMPLATES["셀프케어우선"])

    if carbon_summary.carbon_payback_years <= 3.0:
        notes.append(CAUTION_TEMPLATES["탄소회수짧음"])
    elif carbon_summary.carbon_payback_years >= 7.0:
        notes.append(CAUTION_TEMPLATES["탄소회수긺"])

    notes.append(CAUTION_TEMPLATES["공식데이터기준"])
    return notes


def _build_as_fast_pass(user_inputs: dict, diagnosis: DiagnosisResultV2) -> str:
    product = user_inputs.get("product_type", "에어컨")
    purchase_year = user_inputs.get("purchase_year", "미상")
    symptom = user_inputs.get("symptom_type", "이상없음")
    severity = user_inputs.get("symptom_severity", "없음")
    filter_months = user_inputs.get("filter_clean_months", 0)
    repair_count = user_inputs.get("repair_history_count", 0)

    lines = [
        "=== A/S Fast Pass 초안 ===",
        f"제품: {purchase_year}년식 LG {product}",
        f"주요 증상: {symptom} (심각도: {severity})",
        f"필터 미청소: {filter_months}개월 / 수리 이력: {repair_count}회",
        f"점검 필요도: {diagnosis.inspection_score_100:.0f}점 / 건강등급: {diagnosis.health_grade}",
        f"(※ 점검 필요도는 고장 확률이 아닌 입력 조건 기반 참고 점수)",
    ]

    if filter_months >= 6 and symptom in ("냄새", "냉방약화"):
        lines.append("우선 조치 제안: 필터 청소 후 증상 지속 시 냉매·부품 점검 권장")
    elif symptom == "소음":
        lines.append("우선 조치 제안: 실외기·팬 이상 여부 확인 권장")
    elif symptom == "누수":
        lines.append("우선 조치 제안: 드레인 배수구 막힘 또는 냉매 누출 점검 필요")
    else:
        lines.append("우선 조치 제안: 전반적 점검 후 수리 필요 여부 판단")

    lines.append("※ 이 초안은 입력값 기반 참고용 — 실제 A/S는 LG 서비스센터로 문의하세요.")
    return "\n".join(lines)


def _build_family_summary(
    top_option: OptionScoreV2,
    diagnosis: DiagnosisResultV2,
    user_inputs: dict,
) -> str:
    product_type = user_inputs.get("product_type", "에어컨")
    purchase_year = user_inputs.get("purchase_year", "미상")
    return (
        f"[LG LifeCycle 진단 결과 요약]\n"
        f"{purchase_year}년식 {product_type} (사용 {diagnosis.age_years}년)\n"
        f"건강등급: {diagnosis.health_grade} | 추천: {top_option.label}\n"
        f"3년 에어컨 관련 비용: {top_option.three_year_cost:,}원\n"
        f"※ 현재 입력 조건 기준 추정 — 실제 결과는 사용량·수리비에 따라 다를 수 있음"
    )


def generate_report(
    diagnosis: DiagnosisResultV2,
    options: list[OptionScoreV2],
    user_inputs: dict,
    carbon_summary: CarbonSummary,
) -> DecisionReportV2:
    top    = options[0]
    second = options[1] if len(options) > 1 else None

    reason = (
        f"{top.label}이(가) 현재 조건 기준으로 가장 합리적으로 추정됩니다. "
        f"에어컨 관련 3년 총비용 약 {top.three_year_cost:,}원, "
        f"점검 필요도 {top.inspection_after*100:.0f}점 수준."
    )

    confidence_cards = _build_confidence_cards(diagnosis, user_inputs, top, carbon_summary)
    caution_notes    = _build_caution_notes(diagnosis, options, user_inputs, carbon_summary)
    as_text          = _build_as_fast_pass(user_inputs, diagnosis)
    family_summary   = _build_family_summary(top, diagnosis, user_inputs)

    next_actions = [NEXT_ACTION_MAP.get(top.key, NEXT_ACTION_MAP["계속사용"])]
    if top.key in ("수리후사용", "셀프케어"):
        next_actions.append(NEXT_ACTION_MAP["소모품"])
    if top.key == "수리후사용":
        next_actions.append(NEXT_ACTION_MAP["수리후사용"])
    if top.key == "구독전환":
        next_actions.append(NEXT_ACTION_MAP["구독전환"])
    if top.key == "신제품구매":
        next_actions.append(NEXT_ACTION_MAP["신제품구매"])
    next_actions.append(NEXT_ACTION_MAP["공유"])

    return DecisionReportV2(
        recommendation_1st=top.label,
        recommendation_2nd=second.label if second else "-",
        reason_summary=reason,
        confidence_cards=confidence_cards,
        caution_notes=caution_notes,
        next_actions=next_actions,
        as_fast_pass_text=as_text,
        family_share_summary=family_summary,
    )
