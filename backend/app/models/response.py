"""API 응답 모델 (정식 계약).

- DiagnoseResponse: POST /api/diagnose 요약 응답 (라우트에 response_model로 적용).
- SessionResultResponse 외: GET /api/session/{id} 전체 결과 문서화용
  (현재 라우트는 필드 보존을 위해 dict로 반환하며, 본 모델은 스키마 참조용).
"""
from pydantic import BaseModel


class DiagnoseResponse(BaseModel):
    """POST /api/diagnose 요약 응답."""
    session_id: str
    health_grade: str             # A~E
    health_score: float           # 0~100 (높을수록 건강)
    inspection_score_100: float   # 점검 필요도 0~100
    grade_description: str
    energy_waste_ratio: float
    inconvenience: float
    age_years: int
    bill_base_total: float        # 기저(에어컨 제외) 월 청구액
    ac_delta_old: float           # 구형 에어컨 월 기여 요금
    ac_delta_new: float           # 신형 에어컨 월 기여 요금
    tier_old: str                 # 누진 구간 라벨(구형 포함 시)
    tier_new: str                 # 누진 구간 라벨(신형 포함 시)
    tier_changed: bool            # 누진 구간 이동 여부
    k_ac_old: float               # 에어컨 월 소비전력량(kWh)
    k_ac_new: float
    disclaimer: str


# ── GET /api/session/{id} 전체 결과 (문서화용) ──
class OptionScore(BaseModel):
    key: str
    label: str
    three_year_cost: int          # ※ 5년 총비용(레거시 필드명). 프론트 노출은 total_cost_5y 권장.
    initial_cost: int
    final_score: float
    rank: int
    economy_score: float = 0.0
    reliability_score: float = 0.0
    carbon_score: float = 0.0
    comfort_score: float = 0.0
    initial_score: float = 0.0
    energy_waste_after: float = 0.0
    inspection_after: float = 0.0
    carbon_total: float = 0.0
    inconvenience_after: float = 0.0
    highlights: list[str] = []


class DiagnosisDetail(BaseModel):
    age_years: int
    age_score: float
    inspection_score: float
    inspection_score_100: float
    inconvenience: float
    energy_waste_ratio: float
    energy_waste_kwh_annual: float
    health_grade: str
    health_score: float
    grade_description: str


class CarbonSummary(BaseModel):
    old_use_carbon_3y: float
    new_use_carbon_3y: float
    replace_proxy_carbon: float
    repair_proxy_carbon: float
    carbon_payback_years: float
    annual_carbon_saving: float


class ReportDetail(BaseModel):
    recommendation_1st: str
    recommendation_2nd: str
    reason_summary: str
    confidence_cards: list[str]
    caution_notes: list[str]
    next_actions: list[dict]
    as_fast_pass_text: str
    family_share_summary: str


class SessionResultResponse(BaseModel):
    """GET /api/session/{id} 전체 결과 (문서화용 스키마)."""
    diagnosis: DiagnosisDetail
    ranked_options: list[OptionScore]
    carbon_summary: CarbonSummary
    report: ReportDetail
    k_ac_old: float
    k_ac_new: float
    k_base: float
    current_eff: float
    rerep_prob: float
    parts_exceeded: bool
    parts_expiry_year: int
    disclaimer: str
