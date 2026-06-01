"""전체 진단 파이프라인 — src/ 계산 모듈 래핑."""
import sys
from pathlib import Path
from dataclasses import asdict
from datetime import date
from functools import lru_cache

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.calculations_v2 import run_diagnosis
from src.tariff_calculator import calc_ac_monthly_kwh, calculate_ac_delta_cost, calculate_monthly_bill
from src.scoring_v2 import build_options, score_options, apply_hard_rules, calculate_carbon_summary
from src.report_generator_v2 import generate_report
from src.data_loader import (
    get_device_spec, get_new_device_spec, get_cost_ref,
    get_carbon_ref, get_voc_risk_score,
)

PARTS_AVAILABILITY = {"에어컨": 8, "냉장고": 9, "세탁기": 9, "건조기": 9}


@lru_cache(maxsize=50)
def _cached_device_spec(product_type: str, model_year: int, capacity_kw: float) -> tuple:
    d = get_device_spec(product_type, model_year, capacity_kw)
    return tuple(sorted(d.items()))

@lru_cache(maxsize=20)
def _cached_new_spec(product_type: str, capacity_kw: float) -> tuple:
    d = get_new_device_spec(product_type, capacity_kw)
    return tuple(sorted(d.items()))

@lru_cache(maxsize=20)
def _cached_cost_ref(product_type: str, capacity_kw: float) -> tuple:
    d = get_cost_ref(product_type, capacity_kw)
    return tuple(sorted(d.items()))

@lru_cache(maxsize=10)
def _cached_carbon_ref(product_type: str) -> tuple:
    d = get_carbon_ref(product_type)
    return tuple(sorted(d.items()))


def run_full_pipeline(inputs: dict) -> dict:
    pt  = inputs["product_type"]
    yr  = inputs["purchase_year"]
    cap = inputs["capacity_kw"]

    old_spec   = dict(_cached_device_spec(pt, yr, cap))
    new_spec   = dict(_cached_new_spec(pt, cap))
    cost_ref   = dict(_cached_cost_ref(pt, cap))
    carbon_ref = dict(_cached_carbon_ref(pt))
    voc_risk   = get_voc_risk_score(pt, inputs["symptom_type"])

    diagnosis = run_diagnosis(
        purchase_year        = yr,
        product_type         = pt,
        symptom_type         = inputs["symptom_type"],
        symptom_severity     = inputs["symptom_severity"],
        filter_clean_months  = inputs["filter_clean_months"],
        repair_history_count = inputs["repair_history_count"],
        old_annual_kwh       = old_spec["annual_kwh"],
        new_annual_kwh       = new_spec["annual_kwh"],
        voc_risk_score       = voc_risk,
    )

    season   = inputs.get("season", "하계")
    k_old    = calc_ac_monthly_kwh(old_spec["annual_kwh"], inputs["daily_usage_hours"])
    k_new    = calc_ac_monthly_kwh(new_spec["annual_kwh"], inputs["daily_usage_hours"])
    d_old    = calculate_ac_delta_cost(inputs["base_monthly_kwh"], k_old, inputs["contract_type"], season)
    d_new    = calculate_ac_delta_cost(inputs["base_monthly_kwh"], k_new, inputs["contract_type"], season)
    bill_base = calculate_monthly_bill(inputs["base_monthly_kwh"], inputs["contract_type"], season)

    carbon_summary = calculate_carbon_summary(k_old, k_new, inputs["usage_months"], carbon_ref)

    options = build_options(
        diagnosis            = diagnosis,
        cost_ref             = cost_ref,
        carbon_summary       = carbon_summary,
        ac_delta_old_monthly = d_old["ac_delta_cost"],
        ac_delta_new_monthly = d_new["ac_delta_cost"],
        usage_months         = inputs["usage_months"],
    )

    # 재수리 기대비용
    current_year = date.today().year
    parts_years  = PARTS_AVAILABILITY.get(pt, 8)
    expiry_year  = yr + parts_years
    exceeded     = current_year > expiry_year
    exceeded_by  = current_year - expiry_year if exceeded else 0
    repair_mid   = (cost_ref.get("repair_min", 80000) + cost_ref.get("repair_max", 500000)) / 2

    repair_opt = next((o for o in options if o.key == "수리후사용"), None)
    rerep_prob = 0.0
    if repair_opt:
        mult       = 1.0 + (exceeded_by * 0.15 if exceeded else 0)
        rerep_prob = round(min(diagnosis.inspection_score * diagnosis.age_score * mult, 1.0), 3)
        repair_opt.three_year_cost += int(repair_mid * rerep_prob)

    ranked = score_options(options, inputs["customer_priority"])
    ranked = apply_hard_rules(ranked, diagnosis, carbon_summary, inputs["customer_priority"])

    # 부품보유기간 패널티
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

    report = generate_report(
        diagnosis      = diagnosis,
        options        = ranked,
        user_inputs    = inputs,
        carbon_summary = carbon_summary,
    )

    diag_dict   = asdict(diagnosis)
    carbon_dict = asdict(carbon_summary)
    opts_list   = [asdict(o) for o in ranked]
    rep_dict    = asdict(report)

    return {
        "user_inputs":    inputs,
        "diagnosis":      diag_dict,
        "ranked_options": opts_list,
        "carbon_summary": carbon_dict,
        "report":         rep_dict,
        "delta_old":      d_old,
        "delta_new":      d_new,
        "bill_base_total": bill_base.total,
        "k_ac_old":        k_old,
        "k_ac_new":        k_new,
        "rerep_prob":      rerep_prob,
        "parts_exceeded":  exceeded,
        "parts_expiry_year": expiry_year,
    }
