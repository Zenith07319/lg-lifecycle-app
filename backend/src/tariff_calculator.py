"""
전기요금 계산 모듈 (한국전력 주택용전력 기준)
출처: 2025년 4월 1일 시행 전기요금표
"""

from dataclasses import dataclass


@dataclass
class TariffResult:
    monthly_kwh: float
    base_charge: int
    energy_charge: float
    climate_fee: float
    fuel_adjustment: float
    subtotal: float
    vat: float
    power_fund: float
    total: float
    tier_label: str


TARIFFS = {
    ("고압", "하계"): [
        (0, 300, 730, 105.0),
        (300, 450, 1260, 174.0),
        (450, float("inf"), 6060, 242.3),
    ],
    ("고압", "기타"): [
        (0, 300, 730, 78.3),
        (300, 450, 1260, 147.3),
        (450, float("inf"), 6060, 215.6),
    ],
    ("저압", "하계"): [
        (0, 300, 910, 120.0),
        (300, 450, 1600, 214.6),
        (450, float("inf"), 7300, 307.3),
    ],
    ("저압", "기타"): [
        (0, 300, 910, 93.3),
        (300, 450, 1600, 187.9),
        (450, float("inf"), 7300, 280.6),
    ],
}

CLIMATE_FEE_PER_KWH = 9.0
FUEL_ADJUSTMENT_PER_KWH = 5.0
VAT_RATE = 0.10
POWER_FUND_RATE = 0.037


def _get_tier(tiers: list, kwh: float) -> tuple[int, float, str]:
    for low, high, base, unit in tiers:
        if kwh <= high:
            label = f"{int(low)+1 if low > 0 else 0}~{int(high) if high != float('inf') else '초과'}kWh 구간"
            return base, unit, label
    last = tiers[-1]
    return last[2], last[3], "450kWh 초과 구간"


def calculate_monthly_bill(
    monthly_kwh: float,
    contract_type: str = "고압",
    season: str = "하계",
) -> TariffResult:
    """월 사용량(kWh)으로 전기요금 계산 (현재 입력 조건 기준 추정)."""
    key = (contract_type, season)
    tiers = TARIFFS.get(key, TARIFFS[("고압", "하계")])

    base_charge, unit_price, tier_label = _get_tier(tiers, monthly_kwh)
    energy_charge = monthly_kwh * unit_price
    climate_fee = monthly_kwh * CLIMATE_FEE_PER_KWH
    fuel_adjustment = monthly_kwh * FUEL_ADJUSTMENT_PER_KWH
    subtotal = base_charge + energy_charge + climate_fee + fuel_adjustment
    vat = round(subtotal * VAT_RATE)
    power_fund = round(subtotal * POWER_FUND_RATE)
    total = subtotal + vat + power_fund

    return TariffResult(
        monthly_kwh=monthly_kwh,
        base_charge=base_charge,
        energy_charge=round(energy_charge),
        climate_fee=round(climate_fee),
        fuel_adjustment=round(fuel_adjustment),
        subtotal=round(subtotal),
        vat=vat,
        power_fund=power_fund,
        total=round(total),
        tier_label=tier_label,
    )


def estimate_ac_monthly_kwh(
    rated_power_w: float,
    daily_hours: float,
    usage_months: float = 3,
) -> float:
    """에어컨 월평균 소비전력량 추정 (사용월 기준 월평균)."""
    monthly_kwh_in_season = (rated_power_w / 1000) * daily_hours * 30
    annual_kwh = monthly_kwh_in_season * usage_months
    return annual_kwh / 12


REFERENCE_DAILY_HOURS = 7.8
# 효율관리제도 냉방기간 표준: 4개월(6~9월) × 941시간 운전 = 941h ÷ 4개월 ÷ 30일 ≈ 7.8h/일.
# 라벨 '표준 월간 소비전력량'은 이 7.8h/일·표준 실외온도(24~38℃) 분포 기준으로 산출된 값이다.
# ※ 실제 소비전력은 실외온도에 비선형(고온일수록 급증)하나, 라벨 월간값이 표준 온도분포를
#    이미 내포하므로 사용시간 선형 보정(actual/7.8)으로 근사한다. [한계: 온도 비선형 미반영]


def calc_ac_monthly_kwh(
    monthly_kwh: float,
    actual_daily_hours: float,
    reference_daily_hours: float = REFERENCE_DAILY_HOURS,
) -> float:
    """에어컨 월 소비전력량 추정 (효율관리제도 '표준 월간 소비전력량' 기반).

    에너지소비효율등급 라벨에 표기되는 표준 월간 소비전력량(kWh/월)을 기준값으로,
    실제 사용시간 / 기준 사용시간(8h) 보정계수를 적용한다.
    (구버전은 annual_kwh/12로 월 기준값을 derive했으나, 라벨 월간값을 직접 베이스로 사용하도록 변경.)
    """
    correction = actual_daily_hours / reference_daily_hours
    return round(monthly_kwh * correction, 1)


def calculate_ac_delta_cost(
    k_base: float,
    k_ac: float,
    contract_type: str = "고압",
    season: str = "하계",
) -> dict:
    """에어컨 기여 전기요금 계산: Bill(K_base + K_AC) - Bill(K_base).

    전체 가구 요금이 아닌 에어컨이 추가함으로써 발생하는 요금 차액만 반환.
    """
    bill_total = calculate_monthly_bill(k_base + k_ac, contract_type, season)
    bill_base = calculate_monthly_bill(k_base, contract_type, season)
    delta = bill_total.total - bill_base.total
    return {
        "k_base": k_base,
        "k_ac": k_ac,
        "total_kwh": k_base + k_ac,
        "bill_total": bill_total.total,
        "bill_base": bill_base.total,
        "ac_delta_cost": round(delta),
        "tier_with_ac": bill_total.tier_label,
        "tier_without_ac": bill_base.tier_label,
        "tier_changed": bill_total.tier_label != bill_base.tier_label,
    }


def compare_electricity_cost(
    base_monthly_kwh: float,
    old_ac_monthly_kwh: float,
    new_ac_monthly_kwh: float,
    contract_type: str = "고압",
    season: str = "하계",
) -> dict:
    """구형 vs 신형 에어컨의 전기요금 비교 (현재 입력 조건 기준 추정)."""
    old_total = base_monthly_kwh + old_ac_monthly_kwh
    new_total = base_monthly_kwh + new_ac_monthly_kwh

    old_bill = calculate_monthly_bill(old_total, contract_type, season)
    new_bill = calculate_monthly_bill(new_total, contract_type, season)

    monthly_saving = old_bill.total - new_bill.total
    annual_saving = monthly_saving * 3  # 하계 3개월 기준 연간 절감

    tier_change = old_bill.tier_label != new_bill.tier_label

    return {
        "old_monthly_kwh": old_total,
        "new_monthly_kwh": new_total,
        "old_bill_total": old_bill.total,
        "new_bill_total": new_bill.total,
        "monthly_saving": monthly_saving,
        "annual_saving": annual_saving,
        "three_year_saving": annual_saving * 3,
        "old_tier": old_bill.tier_label,
        "new_tier": new_bill.tier_label,
        "tier_change": tier_change,
        "old_bill_detail": old_bill,
        "new_bill_detail": new_bill,
    }
