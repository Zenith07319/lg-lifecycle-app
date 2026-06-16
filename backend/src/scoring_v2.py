"""
Replace-or-Repair 5개 선택지 점수 계산 모듈 v2

변경사항 (v1 대비):
- TCO: 전체 가구 요금 포함 방식 → 에어컨 기여 델타 방식
- 탄소 proxy: 고정값 350kg → LG ESG 단계별 비율 기반 동적 계산
- 하드 룰 6 추가: 탄소 회수기간 기반 보정
- failure_risk → inspection_score
"""

from dataclasses import dataclass, field
from src.calculations_v2 import DiagnosisResultV2

# ─────────────────────────────────────────────────────────────────────────
# 우선순위 가중치 — 비용/환경/편의 3축 점수화 (2026-06-04 확정)
#   최종 가중치 = 기본(균등 베이스) × (1 - PRIORITY_RATIO) + 우선순위 × PRIORITY_RATIO → 합 1.0
#   미응답(합 0) 시 비용 우선 폴백. (docs/04_calculation_logic.md §5)
# ─────────────────────────────────────────────────────────────────────────
BASE_WEIGHTS = {
    "economy": 0.40, "reliability": 0.20, "carbon": 0.15, "comfort": 0.15, "initial": 0.10,
}                                # 균등 베이스(구 '기본' 모드값)
PRIORITY_RATIO = 0.50            # 우선순위 입력이 최종 가중치에 기여하는 비중 (확정)
AXIS_SPLIT_COST = (0.70, 0.30)   # 비용 축 → (경제성, 초기비용)
AXIS_SPLIT_CONV = (0.50, 0.50)   # 편의 축 → (편의, 신뢰성)


def priority_weights_from_axes(cost: float, env: float, conv: float) -> dict:
    """비용/환경/편의 3축 점수(0~100) → 5지표 가중치 dict (합 = 1.0)."""
    total = cost + env + conv
    if total <= 0:                          # 미응답 → 비용 우선 폴백
        cost, env, conv, total = 1.0, 0.0, 0.0, 1.0
    p_cost, p_env, p_conv = cost / total, env / total, conv / total
    pr = {
        "economy":     p_cost * AXIS_SPLIT_COST[0],
        "initial":     p_cost * AXIS_SPLIT_COST[1],
        "carbon":      p_env,
        "comfort":     p_conv * AXIS_SPLIT_CONV[0],
        "reliability": p_conv * AXIS_SPLIT_CONV[1],
    }
    return {
        k: round((1 - PRIORITY_RATIO) * BASE_WEIGHTS[k] + PRIORITY_RATIO * pr[k], 4)
        for k in BASE_WEIGHTS
    }


# 구 6모드 문자열 → 3축 점수 매핑 (레거시 호출 하위호환)
LEGACY_MODE_AXES = {
    "비용절감": (100, 0, 0), "친환경": (0, 100, 0), "초기비용최소": (100, 0, 0),
    "관리편의": (0, 0, 100), "오래쓰기": (20, 30, 50), "기본": (50, 15, 35),
}

# 구 6모드 가중치 표 — 폐기(3축 대체). 일부 스크립트 참조용으로만 보존.
PRIORITY_WEIGHTS = {
    "비용절감":    {"economy": 0.60, "reliability": 0.15, "carbon": 0.05, "comfort": 0.10, "initial": 0.10},
    "친환경":      {"economy": 0.25, "reliability": 0.15, "carbon": 0.40, "comfort": 0.10, "initial": 0.10},
    "초기비용최소": {"economy": 0.25, "reliability": 0.15, "carbon": 0.10, "comfort": 0.10, "initial": 0.40},
    "관리편의":    {"economy": 0.25, "reliability": 0.30, "carbon": 0.10, "comfort": 0.25, "initial": 0.10},
    "오래쓰기":    {"economy": 0.30, "reliability": 0.20, "carbon": 0.20, "comfort": 0.10, "initial": 0.20},
    "기본":        {"economy": 0.40, "reliability": 0.20, "carbon": 0.15, "comfort": 0.15, "initial": 0.10},
}


def _resolve_priority(priority):
    """우선순위 입력 정규화 → (weights, axes(비용,환경,편의), dominant 라벨).

    priority: 3축 dict({"비용":..,"환경":..,"편의":..}) / tuple / 구 6모드 문자열 / None.
    """
    if isinstance(priority, dict):
        cost = priority.get("비용", priority.get("cost", 0))
        env  = priority.get("환경", priority.get("env", 0))
        conv = priority.get("편의", priority.get("convenience", priority.get("conv", 0)))
        axes = (cost, env, conv)
    elif isinstance(priority, (tuple, list)):
        axes = (tuple(priority) + (0, 0, 0))[:3]
    else:  # 문자열(레거시 6모드) 또는 None
        axes = LEGACY_MODE_AXES.get(priority, LEGACY_MODE_AXES["기본"])
    cost, env, conv = axes
    if cost + env + conv <= 0:
        cost, env, conv = 1, 0, 0
    weights = priority_weights_from_axes(cost, env, conv)
    labels = ("비용", "환경", "편의")
    dominant = labels[max(range(3), key=lambda i: (cost, env, conv)[i])]
    return weights, (cost, env, conv), dominant


@dataclass
class OptionScoreV2:
    key: str
    label: str
    three_year_cost: int       # 에어컨 관련 3년 총비용 (델타 방식)
    inspection_after: float    # 점검 필요도 개선 후 (0~1)
    energy_waste_after: float  # 에너지 낭비 비율 개선 후 (0~1)
    carbon_total: float        # 3년 총 탄소 영향 (kgCO₂)
    inconvenience_after: float # 생활불편도 개선 후 (0~1)
    initial_cost: int          # 초기 지출 (원)
    economy_score: float = 0.0
    reliability_score: float = 0.0
    carbon_score: float = 0.0
    comfort_score: float = 0.0
    initial_score: float = 0.0
    final_score: float = 0.0
    rank: int = 0
    highlights: list = field(default_factory=list)
    elec_cost_5y: int = 0       # 5년 전기 비용 (결정가이드 비용 분해 표시용)
    option_cost_5y: int = 0     # 옵션 고유 비용 5년(수리/구독/구매/셀프 등, 전기 제외)


@dataclass
class CarbonSummary:
    old_use_carbon_3y: float    # 구형 3년 사용단계 탄소 (kgCO₂)
    new_use_carbon_3y: float    # 신형 3년 사용단계 탄소 (kgCO₂)
    replace_proxy_carbon: float # 교체 시 비사용단계 탄소 proxy (kgCO₂)
    repair_proxy_carbon: float  # 수리 시 탄소 proxy (kgCO₂)
    carbon_payback_years: float # 교체 탄소 회수기간 (년)
    annual_carbon_saving: float # 교체 시 연간 탄소 절감 (kgCO₂/년)


def calculate_carbon_summary(
    k_ac_old_monthly: float,
    k_ac_new_monthly: float,
    usage_months: int,
    carbon_ref: dict,
) -> CarbonSummary:
    """LG ESG 단계별 비율 기반 탄소 영향 계산."""
    emission_factor = carbon_ref.get("electricity_emission_factor_kgco2_kwh", 0.4781)

    # LG ESG 비율 (에어컨 특정 모델 기준)
    pre_mfg = carbon_ref.get("lg_esg_pre_mfg_ratio", 0.356)   # 제조전 35.6%
    mfg     = carbon_ref.get("lg_esg_mfg_ratio", 0.007)        # 제조 0.7%
    use     = carbon_ref.get("lg_esg_use_ratio", 0.621)         # 사용 62.1%
    disposal = carbon_ref.get("lg_esg_disposal_ratio", 0.016)  # 폐기 1.6%
    non_use_ratio = pre_mfg + mfg + disposal                   # 37.9%

    repair_carbon = carbon_ref.get("repair_carbon_proxy_kg", 15.0)

    # 5년 사용단계 탄소
    old_use_3y = k_ac_old_monthly * usage_months * COMPARISON_YEARS * emission_factor
    new_use_3y = k_ac_new_monthly * usage_months * COMPARISON_YEARS * emission_factor

    # 교체 시 비사용단계 탄소 proxy (LG ESG 비율 적용)
    replace_proxy = new_use_3y * (non_use_ratio / use) if use > 0 else 0.0

    # 탄소 회수기간 (년) — inf 대신 999로 처리 (Rule 6 적용 안전)
    annual_saving = (k_ac_old_monthly - k_ac_new_monthly) * usage_months * emission_factor
    payback_years = (replace_proxy / annual_saving) if annual_saving > 0.1 else 999.0

    return CarbonSummary(
        old_use_carbon_3y=round(old_use_3y, 1),
        new_use_carbon_3y=round(new_use_3y, 1),
        replace_proxy_carbon=round(replace_proxy, 1),
        repair_proxy_carbon=round(repair_carbon, 1),
        carbon_payback_years=round(payback_years, 1),
        annual_carbon_saving=round(annual_saving, 1),
    )


COMPARISON_YEARS = 5  # 비교 기준 연수


def build_options(
    diagnosis: DiagnosisResultV2,
    cost_ref: dict,
    carbon_summary: CarbonSummary,
    ac_delta_old_monthly: int,
    ac_delta_new_monthly: int,
    usage_months: int = 4,
    energy_ctx: dict | None = None,
) -> list[OptionScoreV2]:
    """5개 선택지별 에어컨 관련 5년 비용·점검필요도·탄소·불편도 추정.

    energy_ctx (docs/04g): power_excess_decomp 결과. 옵션별 효율(ce/ce_self/ce_rep)과
    가역 기반 해소비율(sc_eff/rp_eff)로 낭비비율·점검도·불편 완화를 일관 적용.
    미전달 시(하위호환) 구 고정배율 사용.
    """

    repair_mid = (cost_ref.get("repair_min", 80000) + cost_ref.get("repair_max", 500000)) / 2
    visit_fee = cost_ref.get("visit_fee", 39600)
    selfcare_mid = (cost_ref.get("selfcare_cost_min", 15000) + cost_ref.get("selfcare_cost_max", 50000)) / 2
    subscription_monthly = cost_ref.get("subscription_monthly_fee", 49000)
    purchase_mid = (cost_ref.get("purchase_price_min", 1000000) + cost_ref.get("purchase_price_max", 1300000)) / 2

    # 에어컨 관련 5년 전기요금 (델타 × 사용개월/년 × 5년)
    seasons = usage_months * COMPARISON_YEARS
    elec_old_5y = ac_delta_old_monthly * seasons
    elec_new_5y = ac_delta_new_monthly * seasons
    sub_months  = COMPARISON_YEARS * 12  # 60개월

    cs = carbon_summary
    ip = diagnosis.inspection_score
    inconv = diagnosis.inconvenience

    if energy_ctx:
        sc, rp, rev = energy_ctx["sc_eff"], energy_ctx["rp_eff"], energy_ctx["rev"]
        w_cont = round(1.0 / energy_ctx["ce"] - 1.0, 3)
        w_self = round(1.0 / energy_ctx["ce_self"] - 1.0, 3)
        w_rep  = round(1.0 / energy_ctx["ce_rep"] - 1.0, 3)
        # 셀프/수리 점검도 완화 = 각자 전력블록에서 없애는 비율 × 0.85
        self_insp = max(ip * (1 - 0.85 * sc), 0.03)
        rep_insp  = max(ip * (1 - 0.85 * rp), 0.03)
        self_inconv = max(inconv * (1 - 0.7 * rev), 0.0)   # 가역증상만 완화
        rep_inconv  = max(inconv * 0.15, 0.03)
        self_carbon = cs.old_use_carbon_3y * (1 - 0.30 * sc) + cs.repair_proxy_carbon * 0.3
        rep_carbon  = cs.old_use_carbon_3y * (1 - 0.30 * rp) + cs.repair_proxy_carbon
    else:  # 하위호환(구 고정배율)
        w_cont, w_self, w_rep = diagnosis.energy_waste_ratio, diagnosis.energy_waste_ratio * 0.97, diagnosis.energy_waste_ratio * 0.65
        self_insp, rep_insp = max(ip - 0.12, 0.05), max(ip - 0.25, 0.10)
        self_inconv, rep_inconv = max(inconv - 0.20, 0.0), max(inconv - 0.35, 0.05)
        self_carbon = cs.old_use_carbon_3y * 0.95 + cs.repair_proxy_carbon * 0.3
        rep_carbon  = cs.old_use_carbon_3y * 0.70 + cs.repair_proxy_carbon

    options = [
        OptionScoreV2(
            key="계속사용",
            label="계속 사용",
            three_year_cost=int(elec_old_5y),
            inspection_after=ip,
            energy_waste_after=w_cont,
            carbon_total=cs.old_use_carbon_3y,
            inconvenience_after=inconv,
            initial_cost=0,
        ),
        OptionScoreV2(
            key="셀프케어",
            label="셀프케어 후 사용",
            three_year_cost=int(elec_old_5y * 0.95 + selfcare_mid * COMPARISON_YEARS),
            inspection_after=self_insp,
            energy_waste_after=w_self,
            carbon_total=self_carbon,
            inconvenience_after=self_inconv,
            initial_cost=int(selfcare_mid),
        ),
        OptionScoreV2(
            key="수리후사용",
            label="수리 후 사용",
            three_year_cost=int(elec_old_5y * 0.60 + repair_mid + visit_fee),
            inspection_after=rep_insp,
            energy_waste_after=w_rep,
            carbon_total=rep_carbon,
            inconvenience_after=rep_inconv,
            initial_cost=int(repair_mid + visit_fee),
        ),
        OptionScoreV2(
            key="구독전환",
            label="구독 전환",
            three_year_cost=int(subscription_monthly * sub_months + elec_new_5y),
            inspection_after=0.05,
            energy_waste_after=0.0,
            carbon_total=cs.new_use_carbon_3y + cs.replace_proxy_carbon * 0.8,
            inconvenience_after=0.05,
            initial_cost=0,
        ),
        OptionScoreV2(
            key="신제품구매",
            label="신제품 구매",
            three_year_cost=int(purchase_mid + elec_new_5y),
            inspection_after=0.03,
            energy_waste_after=0.0,
            carbon_total=cs.new_use_carbon_3y + cs.replace_proxy_carbon,
            inconvenience_after=0.02,
            initial_cost=int(purchase_mid),
        ),
    ]
    return options


def _normalize(values: list[float], floor_frac: float = 0.20) -> list[float]:
    """floor 정규화 (docs/04d): 분모 하한 = max(실범위, |최대|×0.20).

    구 min-max는 미세 절대차를 0~1로 증폭해 동순위를 과대 분리(셀프케어 오추천 버그).
    floor로 '미미한 차이는 미미하게' 유지. 비용·탄소·초기비용 등 자연 0~1 스케일이
    없는 지표에만 사용(점검·낭비·불편은 절대값 그대로).
    """
    mn, mx = min(values), max(values)
    rng = mx - mn
    if rng == 0:
        return [0.0] * len(values)
    den = max(rng, abs(mx) * floor_frac) if mx != 0 else 1.0
    return [(v - mn) / den for v in values]


def score_options(
    options: list[OptionScoreV2],
    priority_mode="기본",
) -> list[OptionScoreV2]:
    """가중치 반영 최종 점수 산정 및 순위 부여. priority_mode: 3축 입력 또는 레거시 문자열."""
    weights, _axes, _dominant = _resolve_priority(priority_mode)

    costs       = [o.three_year_cost for o in options]
    inspections = [o.inspection_after for o in options]
    wastes      = [o.energy_waste_after for o in options]
    carbons     = [o.carbon_total for o in options]
    discomforts = [o.inconvenience_after for o in options]
    initials    = [o.initial_cost for o in options]

    # 낮을수록 유리한 지표 → 반전. (docs/04d)
    #  · 점검/낭비/불편 = 이미 0~1 절대 지표 → 절대값 그대로 (min-max 증폭 금지)
    #  · 비용/탄소/초기 = 자연 0~1 스케일 없음 → floor 정규화
    cost_norm     = [1 - v for v in _normalize(costs)]
    inspect_norm  = [1 - min(v, 1.0) for v in inspections]
    waste_norm    = [1 - min(v, 1.0) for v in wastes]
    carbon_norm   = [1 - v for v in _normalize(carbons)]
    comfort_norm  = [1 - min(v, 1.0) for v in discomforts]
    initial_norm  = [1 - v for v in _normalize(initials)]

    # 경제성 = 비용 0.80 + 에너지낭비 0.20 (수정: 절대비용 중심, 낭비 보조)
    eco_norm = [0.80 * c + 0.20 * w for c, w in zip(cost_norm, waste_norm)]

    for i, opt in enumerate(options):
        opt.economy_score     = round(eco_norm[i], 3)
        opt.reliability_score = round(inspect_norm[i], 3)
        opt.carbon_score      = round(carbon_norm[i], 3)
        opt.comfort_score     = round(comfort_norm[i], 3)
        opt.initial_score     = round(initial_norm[i], 3)
        opt.final_score = round(
            eco_norm[i]       * weights["economy"]
            + inspect_norm[i] * weights["reliability"]
            + carbon_norm[i]  * weights["carbon"]
            + comfort_norm[i] * weights["comfort"]
            + initial_norm[i] * weights["initial"],
            3,
        )

    # 오래쓰기 보정: 구 6모드 폐기 → 3축 미적용. 레거시 문자열 "오래쓰기"만 하위호환.
    if priority_mode == "오래쓰기":
        for opt in options:
            if opt.key in ("계속사용", "셀프케어", "수리후사용"):
                # 수정: ×1.10 → ×1.20 (오래쓰기 취지 강화)
                opt.final_score = round(min(opt.final_score * 1.20, 1.0), 3)
            elif opt.key in ("구독전환", "신제품구매"):
                # 신규 추가: 오래쓰기인데 새 가전 추천 억제
                opt.final_score = round(max(opt.final_score - 0.10, 0.0), 3)

    # 표시 해상도 = 1점(정수). 그 미만 차이는 유의미하지 않음 → 동점 처리 후
    # tie-break: 초기비용 낮은(덜 침습적인) 옵션 우선. (docs/04g)
    for opt in options:
        opt.final_score = round(opt.final_score, 2)
    sorted_opts = sorted(options, key=lambda o: (-o.final_score, o.initial_cost))
    for rank, opt in enumerate(sorted_opts, 1):
        opt.rank = rank
    return sorted_opts


def apply_hard_rules(
    options: list[OptionScoreV2],
    diagnosis: DiagnosisResultV2,
    carbon_summary: CarbonSummary,
    priority_mode="기본",
) -> list[OptionScoreV2]:
    """하드 룰 적용. priority_mode: 3축 입력 또는 레거시 문자열."""
    _w, _axes, dominant = _resolve_priority(priority_mode)

    # Rule 1: 점검 필요도 낮음(상태 양호) → 교체 선택지 하향. (docs/04g)
    #  낭비비율 ②안(신품 자기대비)은 노후기기에서 구조적으로 커져 구 'and 낭비<0.20'
    #  조건이 무력화됨 → 점검필요도 단일 조건으로 보강. '교체 무조건 추천 금지'의 직접 구현.
    if diagnosis.inspection_score < 0.25:
        for opt in options:
            if opt.key in ("구독전환", "신제품구매"):
                opt.final_score = round(max(opt.final_score - 0.10, 0.0), 3)
                opt.highlights.append("점검 필요도가 낮아 교체 우선순위 하향")

    # Rule 2: 수리비 경고
    repair_opt = next((o for o in options if o.key == "수리후사용"), None)
    buy_opt    = next((o for o in options if o.key == "신제품구매"), None)
    if repair_opt and buy_opt and repair_opt.initial_cost > buy_opt.initial_cost * 0.50:
        repair_opt.highlights.append("수리비가 신제품가 대비 높은 편 — 견적 확인 권장")

    # Rule 3: 셀프케어 우선 (냄새·필터 미청소 + 작동 이상 없음)
    # 호출 측에서 symptom_type을 별도 전달해야 하므로 여기서는 skip (report_generator에서 처리)

    # Rule 4: 구독 우선 (비용 우선 = 초기비용 민감 + 점검 필요도 높음 → 구독 가점 강화)
    if dominant == "비용" and diagnosis.inspection_score >= 0.50:
        sub_opt = next((o for o in options if o.key == "구독전환"), None)
        if sub_opt:
            # 수정: +0.05 → +0.12 (초기비용 민감 상황에서 구독 유인 강화)
            sub_opt.final_score = round(min(sub_opt.final_score + 0.12, 1.0), 3)
            sub_opt.highlights.append("초기비용 최소화 우선 + 점검 필요도 높음 → 구독 가점")

    # Rule 5: 구매 우선 (수리비 과다 + 점검 필요도 높음)
    if repair_opt and buy_opt:
        if repair_opt.initial_cost > buy_opt.initial_cost * 0.60 and diagnosis.inspection_score >= 0.60:
            buy_opt.highlights.append("수리비 과다·점검 필요도 높음 → 신제품 구매 검토")

    # Rule 6: 탄소 보정 (환경 우선 + 탄소 회수기간 너무 긴 경우 교체 하향)
    if dominant == "환경" and carbon_summary.carbon_payback_years > 7.0:
        for opt in options:
            if opt.key in ("구독전환", "신제품구매"):
                opt.final_score = round(max(opt.final_score - 0.08, 0.0), 3)
                opt.highlights.append(
                    f"탄소 회수기간 {carbon_summary.carbon_payback_years:.1f}년 — "
                    "수리·셀프케어가 탄소 기준 더 유리할 수 있음"
                )

    # Rule A (신규): 에너지낭비 없을 때 구독 패널티
    # 절감 효과 없는데 5년 비용이 훨씬 비쌈 → 구독 비합리
    sub_opt = next((o for o in options if o.key == "구독전환"), None)
    if sub_opt and diagnosis.energy_waste_ratio < 0.05:
        sub_opt.final_score = round(max(sub_opt.final_score - 0.10, 0.0), 3)
        sub_opt.highlights.append("전기효율 차이 없음 — 구독 시 비용 절감 효과 없어 구매 대비 불리")

    # Rule B (신규): 탄소회수 짧고 에너지낭비 큰 경우 → 구매 가점
    # 5년 안에 본전 + 장기 절감 → 신제품 구매가 구독보다 명확히 유리
    if buy_opt and carbon_summary.carbon_payback_years < 5.0 and diagnosis.energy_waste_ratio > 0.40:
        buy_opt.final_score = round(min(buy_opt.final_score + 0.08, 1.0), 3)
        buy_opt.highlights.append(
            f"탄소 회수 {carbon_summary.carbon_payback_years:.1f}년·에너지낭비 "
            f"{diagnosis.energy_waste_ratio*100:.0f}% — 신제품 구매가 장기적으로 유리"
        )

    return sorted(options, key=lambda o: o.final_score, reverse=True)
