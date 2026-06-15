"""전체 진단 파이프라인 — 효율감퇴 모델 + 여름 고지서 기반 k_base 자동 도출."""
import sys
import json
from pathlib import Path
from dataclasses import asdict
from datetime import date
from functools import lru_cache

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.calculations_v2 import (
    run_diagnosis, SYMPTOM_RISK_MAP, SEVERITY_MULTIPLIER,
    power_excess_decomp, EFF_FLOOR, R_AGE_YR, classify_form,
)
from src.tariff_calculator import calc_ac_monthly_kwh, calculate_ac_delta_cost, calculate_monthly_bill
from src.scoring_v2 import build_options, score_options, apply_hard_rules, calculate_carbon_summary
from src.report_generator_v2 import generate_report
from src.data_loader import (
    get_device_spec, get_new_device_spec, get_cost_ref,
    get_carbon_ref, get_voc_risk_score,
)

PARTS_AVAILABILITY = {"에어컨": 8, "냉장고": 9, "세탁기": 9, "건조기": 9}
EFFICIENCY_DECAY   = 0.025
EFFICIENCY_FLOOR   = 0.65
# 1등급 고효율 신형의 동급 구형 대비 평균 정격소비비.
# 효율관리제도 신고스펙상 (1등급 신형)/(3등급 구형) ≈ 0.67~0.73 → 평균 0.70 적용.
# 이로써 신형 비교값을 '용량표'가 아니라 구형 라벨값 × 효율비로 도출 → 전력 계산이 용량과 무관해진다.
# [한계] 구형이 이미 1등급인 경우 절감폭을 다소 과대평가(상수 비율의 근사 한계).
NEW_EFF_RATIO      = 0.70


@lru_cache(maxsize=50)
def _cached_device_spec(product_type: str, model_year: int, capacity_kw: float) -> tuple:
    return tuple(sorted(get_device_spec(product_type, model_year, capacity_kw).items()))

@lru_cache(maxsize=20)
def _cached_new_spec(product_type: str, capacity_kw: float) -> tuple:
    return tuple(sorted(get_new_device_spec(product_type, capacity_kw).items()))

@lru_cache(maxsize=1)
def _new_models_map() -> dict:
    """data/new_models.json → {모델코드: 모델dict}. 신형 비교 기준 주입용."""
    p = Path(__file__).parent.parent.parent / "data" / "new_models.json"
    try:
        with open(p, encoding="utf-8") as f:
            return {m["model_code"]: m for m in json.load(f).get("models", [])}
    except Exception:
        return {}

@lru_cache(maxsize=20)
def _cached_cost_ref(product_type: str, capacity_kw: float) -> tuple:
    return tuple(sorted(get_cost_ref(product_type, capacity_kw).items()))

@lru_cache(maxsize=10)
def _cached_carbon_ref(product_type: str) -> tuple:
    return tuple(sorted(get_carbon_ref(product_type).items()))


SUMMER_PEAK_MONTHS = 2  # 한전 주택용 하계 요금 적용기간(7.1~8.31) = 2개월. 그 외 사용월은 평시(기타) 단가.


def _calc_5yr_elec(catalog_kwh: float, eff_list: list, daily_hours: float,
                   k_base: float, contract_type: str, usage_months: int) -> int:
    """연도별 효율감퇴를 반영한 5년 전기비 합산.

    사용월(설문)을 여름분/평시분으로 나눠 계절별 요금으로 합산한다.
    하계 요금은 7~8월(SUMMER_PEAK_MONTHS)에만 적용되므로, 그 외 사용월은 '기타(평시)' 단가가 맞다.
    사용월 ≤ 2개월이면 전부 하계(평시분 0).
    """
    summer_n = min(usage_months, SUMMER_PEAK_MONTHS)
    normal_n = max(usage_months - summer_n, 0)
    total = 0
    for eff in eff_list:
        actual_kwh = catalog_kwh / eff
        k_ac = calc_ac_monthly_kwh(actual_kwh, daily_hours)
        hot = calculate_ac_delta_cost(k_base, k_ac, contract_type, "하계")["ac_delta_cost"]
        nor = calculate_ac_delta_cost(k_base, k_ac, contract_type, "기타")["ac_delta_cost"]
        total += hot * summer_n + nor * normal_n
    return int(total)


# 명세서 증상 라벨 → 엔진 내부키 (내부키가 직접 오면 그대로 통과)
_SYMPTOM_LABEL_TO_KEY = {
    "증상없음": "이상없음", "전기요금증가": "전기료부담", "냄새": "냄새",
    "소음": "소음", "성능저하": "냉방약화", "누수": "누수", "작동불량": "작동불가",
}
_LEGACY_SEV_TO_5 = {"없음": 1, "낮음": 2, "중간": 3, "높음": 4}


def _resolve_symptom(inputs: dict):
    """복수 증상/레거시 입력 → (대표 내부키, 대표 심각도 1~5, 증상쌍 목록, 라벨목록).

    04h: 엔진은 선택 증상 '전체'(sym_pairs)를 받아 전력·불편을 합산한다.
    대표 증상(rep)은 VOC 위험도 조회·이산 규칙용으로만 별도 사용한다(누수 안전은 sym_pairs로 판정).
    """
    pairs = []  # [(내부키, 심각도 1~5)]
    for s in (inputs.get("symptoms") or []):
        key = _SYMPTOM_LABEL_TO_KEY.get(s.get("type"), s.get("type"))
        pairs.append((key, int(s.get("severity", 3))))
    if not pairs and inputs.get("symptom_type"):  # 레거시(단일·4단계)
        pairs.append((inputs["symptom_type"], _LEGACY_SEV_TO_5.get(inputs.get("symptom_severity"), 1)))
    # '이상없음'은 전력·불편 기여 0 → 합산 목록에서 제외
    sym_pairs = [(k, v) for k, v in pairs if k != "이상없음"]
    if not sym_pairs:
        return "이상없음", 1, [], []
    rep = max(sym_pairs, key=lambda p: SYMPTOM_RISK_MAP.get(p[0], 0.0) * SEVERITY_MULTIPLIER.get(p[1], 1.0))
    return rep[0], rep[1], sym_pairs, [f"{k}({v})" for k, v in sym_pairs]


def _resolve_priority(inputs: dict):
    """우선순위 입력 → score_options/apply_hard_rules 인자.

    3축(priority_*_score) 우선, 없으면 레거시 customer_priority, 둘 다 없으면 비용 우선.
    (scoring_v2._resolve_priority가 dict(3축)/str(6모드) 모두 처리)
    """
    c = inputs.get("priority_cost_score")
    e = inputs.get("priority_env_score")
    v = inputs.get("priority_convenience_score")
    if c is not None or e is not None or v is not None:
        return {"비용": c or 0, "환경": e or 0, "편의": v or 0}
    if inputs.get("customer_priority"):
        return inputs["customer_priority"]
    return {"비용": 70, "환경": 20, "편의": 10}  # 미입력 → 비용 우선


def run_full_pipeline(inputs: dict) -> dict:
    pt  = inputs["product_type"]
    yr  = inputs["purchase_year"]
    cap = inputs["capacity_kw"]

    # 신형 비교 기준(설문 마지막 화면에서 선택). 있으면 신형 baseline을 실제 제품값으로 대체.
    sel_model = _new_models_map().get(inputs.get("new_model_code")) if inputs.get("new_model_code") else None
    # 세션 DB는 user_inputs만 영속화(고정 컬럼) → 결과화면이 읽도록 선택 모델을 inputs에 stash(form_estimated와 동일 패턴).
    inputs["selected_new_model"] = sel_model

    rep_symptom, rep_severity, sym_pairs, symptom_labels = _resolve_symptom(inputs)
    priority = _resolve_priority(inputs)
    # report_generator/AS패스가 읽는 레거시 단일 필드 동기화(새 플로우는 symptoms 리스트만 전송)
    inputs["symptom_type"] = rep_symptom
    inputs["symptom_severity"] = rep_severity
    # 벽걸이/스탠드 추정 (냉방용량 + 월간소비전력량 라벨 — docs/04i)
    form_est, form_conf = classify_form(cap, inputs.get("ac_monthly_kwh_input") or 0)
    inputs["form_estimated"] = form_est

    old_spec   = dict(_cached_device_spec(pt, yr, cap))   # 월간kwh 미입력 시 폴백용
    cost_ref   = dict(_cached_cost_ref(pt, cap))
    carbon_ref = dict(_cached_carbon_ref(pt))
    voc_risk   = get_voc_risk_score(pt, rep_symptom)

    # ── 에너지 베이스 = 월간소비전력량 (용량 비의존) ──────────────────────
    # 구형: 에어컨 라벨 월간소비전력량 입력값 우선. 미입력 시에만 용량표로 폴백(최후 수단).
    user_ackwh = inputs.get("ac_monthly_kwh_input") or 0
    if user_ackwh and user_ackwh > 0:
        old_monthly_kwh = float(user_ackwh)
        ac_kwh_source = "input"
    else:
        base_kwh = old_spec.get("monthly_kwh", old_spec["annual_kwh"] / 12)
        # 스펙 표(에어컨 2.5~5.0kW)에 없는 용량(스탠드 6.5~9.0kW 등)은 가장 가까운
        # 레코드가 5.0kW에서 멈춰 과소평가된다. 동일 효율급에서 월간소비전력량 ∝ 냉방용량이므로
        # 입력 용량/스펙 용량 비로 보정(0.5~4.0배 클램프). (docs/04j)
        spec_cap = float(old_spec.get("capacity_kw", cap) or cap)
        ratio = max(0.5, min(cap / spec_cap, 4.0)) if spec_cap > 0 else 1.0
        old_monthly_kwh = base_kwh * ratio
        ac_kwh_source = "estimate"
    old_annual_kwh = old_monthly_kwh * 12
    # 신형 비교값: 선택 제품이 있으면 그 제품의 실제 월간소비전력량(표준 라벨, 구형과 동일 기준),
    # 없으면 구형 라벨 × 효율비(0.70) 폴백. → 선택 시 가정이 아닌 실제 1등급 스펙으로 비교(공신력).
    if sel_model and sel_model.get("monthly_kwh"):
        new_monthly_kwh = float(sel_model["monthly_kwh"])
        new_kwh_source = "selected_model"
    else:
        new_monthly_kwh = round(old_monthly_kwh * NEW_EFF_RATIO, 1)
        new_kwh_source = "eff_ratio"
    new_annual_kwh  = new_monthly_kwh * 12

    diagnosis = run_diagnosis(
        purchase_year        = yr,
        product_type         = pt,
        symptoms             = sym_pairs,
        filter_clean_months  = inputs["filter_clean_months"],
        repair_history_count = inputs["repair_history_count"],
        old_annual_kwh       = old_annual_kwh,
        new_annual_kwh       = new_annual_kwh,
        voc_risk_score       = voc_risk,
    )

    # ── 효율감퇴 모델 (노션 공식) ──────────────────────────────────────
    season      = inputs.get("season", "하계")
    daily_hours = inputs["daily_usage_hours"]
    usage_months = inputs["usage_months"]
    contract    = inputs["contract_type"]

    age_years   = date.today().year - yr
    # ── 효율 과소비 분해 (docs/04g): 영구(연식 1.5%) + 가역(증상 MDPI + 필터) ──
    decomp      = power_excess_decomp(age_years, sym_pairs, inputs["filter_clean_months"])
    current_eff = decomp["ce"]

    # 현재 실제 소비 kWh (카탈로그 월간 / 잔존효율)
    k_old = calc_ac_monthly_kwh(old_monthly_kwh / current_eff, daily_hours)
    k_new = calc_ac_monthly_kwh(new_monthly_kwh, daily_hours)

    # ── k_base 도출 ─────────────────────────────────────────────────────
    # 여름 총량 입력 시: k_base = summer_total - k_old (자동 도출)
    # 미입력 시: 기저 참고값 사용
    summer_total = inputs.get("summer_monthly_kwh", 0)
    if summer_total and summer_total > k_old:
        k_base = summer_total - k_old
    else:
        k_base = float(inputs.get("base_monthly_kwh", 350))

    d_old     = calculate_ac_delta_cost(k_base, k_old, contract, season)
    d_new     = calculate_ac_delta_cost(k_base, k_new, contract, season)
    bill_base = calculate_monthly_bill(k_base, contract, season)

    # ── 5년 효율감퇴 시퀀스 (docs/04g) ─────────────────────────────────
    # 옵션별 시작효율: 계속=현상태 / 셀프=가역 일부 회복 / 수리=영구만 / 신형=1.0
    # 미래는 전 옵션 영구 1.5%/년만 감퇴(가역 재증식 데이터 없음 = 보수적).
    PERM = R_AGE_YR / 100.0   # 0.015/년
    effs = {
        "계속사용":  [max(decomp["ce"]      - PERM*(y-1), EFF_FLOOR) for y in range(1,6)],
        "셀프케어":  [max(decomp["ce_self"] - PERM*(y-1), EFF_FLOOR) for y in range(1,6)],
        "수리후사용": [max(decomp["ce_rep"]  - PERM*(y-1), EFF_FLOOR) for y in range(1,6)],
        "신형":      [max(1.0              - PERM*(y-1), EFF_FLOOR) for y in range(1,6)],
    }

    elec_5yr = {
        "계속사용":  _calc_5yr_elec(old_monthly_kwh, effs["계속사용"],  daily_hours, k_base, contract, usage_months),
        "셀프케어":  _calc_5yr_elec(old_monthly_kwh, effs["셀프케어"],  daily_hours, k_base, contract, usage_months),
        "수리후사용": _calc_5yr_elec(old_monthly_kwh, effs["수리후사용"], daily_hours, k_base, contract, usage_months),
        "신형":      _calc_5yr_elec(new_monthly_kwh,  effs["신형"],      daily_hours, k_base, contract, usage_months),
    }

    selfcare_mid = int((cost_ref.get("selfcare_cost_min",15000)+cost_ref.get("selfcare_cost_max",50000))/2)
    repair_mid   = int((cost_ref.get("repair_min",80000)+cost_ref.get("repair_max",500000))/2)
    visit_fee    = int(cost_ref.get("visit_fee",39600))
    sub_monthly  = int(cost_ref.get("subscription_monthly_fee",49000))
    purchase_mid = int((cost_ref.get("purchase_price_min",1000000)+cost_ref.get("purchase_price_max",1300000))/2)
    # 선택 신형이 있으면 구매가=판매가, 구독료=구독월정액을 실제 제품값으로 대체(가격 공신력).
    if sel_model:
        if sel_model.get("sale_price"):
            purchase_mid = int(sel_model["sale_price"])
        if sel_model.get("sub_fee"):          # 구독 미제공(0) 모델은 카테고리 폴백 유지
            sub_monthly = int(sel_model["sub_fee"])

    carbon_summary = calculate_carbon_summary(k_old, k_new, usage_months, carbon_ref)

    options = build_options(
        diagnosis            = diagnosis,
        cost_ref             = cost_ref,
        carbon_summary       = carbon_summary,
        ac_delta_old_monthly = d_old["ac_delta_cost"],
        ac_delta_new_monthly = d_new["ac_delta_cost"],
        usage_months         = usage_months,
        energy_ctx           = decomp,
    )

    # 효율감퇴 기반 5년 비용으로 덮어쓰기
    for opt in options:
        if opt.key == "계속사용":
            opt.three_year_cost = elec_5yr["계속사용"]
        elif opt.key == "셀프케어":
            opt.three_year_cost = elec_5yr["셀프케어"] + selfcare_mid * 5
        elif opt.key == "수리후사용":
            opt.three_year_cost = elec_5yr["수리후사용"] + repair_mid + visit_fee
        elif opt.key == "구독전환":
            opt.three_year_cost = sub_monthly * 60 + elec_5yr["신형"]
        elif opt.key == "신제품구매":
            opt.three_year_cost = purchase_mid + elec_5yr["신형"]

    # ── 재수리 기대비용 ─────────────────────────────────────────────────
    current_year = date.today().year
    parts_years  = PARTS_AVAILABILITY.get(pt, 8)
    expiry_year  = yr + parts_years
    exceeded     = current_year > expiry_year
    exceeded_by  = current_year - expiry_year if exceeded else 0

    repair_opt = next((o for o in options if o.key == "수리후사용"), None)
    rerep_prob = 0.0
    if repair_opt:
        mult       = 1.0 + (exceeded_by * 0.15 if exceeded else 0)
        rerep_prob = round(min(diagnosis.inspection_score * diagnosis.age_score * mult, 1.0), 3)
        repair_opt.three_year_cost += int(repair_mid * rerep_prob)

    ranked = score_options(options, priority)
    ranked = apply_hard_rules(ranked, diagnosis, carbon_summary, priority)

    if exceeded:
        for opt in ranked:
            if opt.key == "수리후사용":
                opt.final_score = round(max(opt.final_score - 0.20, 0.0), 3)
                opt.highlights.append(
                    f"부품보유기간 {exceeded_by}년 초과 ({expiry_year}년 만료) — 수리 전 부품 수급 확인 필요"
                )
        ranked = sorted(ranked, key=lambda o: o.final_score, reverse=True)
        for rank, opt in enumerate(ranked, 1):
            opt.rank = rank

    # [삭제] 누수 시 '수리 후 사용' 1순위 강제 하드룰 폐지.
    # 부품보유 초과·E등급(노후) 기기에서도 수리를 강제해 모순(부품없는데 수리 권장)이 발생 → 순위는 점수대로.
    # 누수의 위험·시급성은 증상→전력대역(누수 24.8~36.5%)·점검필요도·건강등급에 이미 반영됨.

    report = generate_report(
        diagnosis      = diagnosis,
        options        = ranked,
        user_inputs    = inputs,
        carbon_summary = carbon_summary,
    )

    return {
        "user_inputs":    inputs,
        "diagnosis":      asdict(diagnosis),
        "ranked_options": [asdict(o) for o in ranked],
        "carbon_summary": asdict(carbon_summary),
        "report":         asdict(report),
        "delta_old":      d_old,
        "delta_new":      d_new,
        "bill_base_total": bill_base.total,
        "k_ac_old":        k_old,
        "k_ac_new":        k_new,
        "k_base":          k_base,
        "ac_kwh_source":   ac_kwh_source,   # "input"=사용자 라벨값 / "estimate"=표 추정
        "new_kwh_source":  new_kwh_source,  # "selected_model"=선택 신형 실값 / "eff_ratio"=0.70 폴백
        "selected_new_model": sel_model,    # 선택한 1등형 신형(없으면 None)
        "current_eff":     current_eff,
        "rerep_prob":      rerep_prob,
        "parts_exceeded":  exceeded,
        "parts_expiry_year": expiry_year,
        "form_estimated":  form_est,    # 벽걸이/스탠드 추정 (docs/04i)
        "form_confidence": form_conf,   # high/medium/low
    }
