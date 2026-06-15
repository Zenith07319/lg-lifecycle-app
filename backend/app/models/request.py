from pydantic import BaseModel, Field
from typing import Literal, Optional

# 증상 라벨 (명세서 기준 · 프론트 노출)
SymptomLabel = Literal["증상없음", "전기요금증가", "냄새", "소음", "성능저하", "누수", "작동불량"]
# 레거시 내부키 (과도기 하위호환)
SymptomKeyLegacy = Literal["이상없음", "냄새", "냉방약화", "소음", "전기료부담", "누수", "작동불가"]
SeverityLegacy   = Literal["없음", "낮음", "중간", "높음"]
PriorityLegacy   = Literal["기본", "비용절감", "친환경", "초기비용최소", "관리편의", "오래쓰기"]
ProductType  = Literal["에어컨", "냉장고", "세탁기", "건조기"]
ContractType = Literal["고압", "저압"]
SeasonType   = Literal["하계", "기타"]


class SymptomInput(BaseModel):
    """증상 1건 — 명세서 라벨 + 심각도 1~5점."""
    type: SymptomLabel
    severity: int = Field(..., ge=1, le=5, description="증상 심각도 1~5점")


class DiagnoseRequest(BaseModel):
    # ── 제품 / 사용환경 ──
    product_type:        ProductType  = "에어컨"
    purchase_year:       int          = Field(..., ge=1992, le=2026)
    capacity_kw:         float        = Field(..., gt=0, le=20)
    daily_usage_hours:   float        = Field(..., ge=1, le=24)
    usage_months:        int          = Field(..., ge=1, le=12)
    contract_type:       ContractType = "고압"
    base_monthly_kwh:    float        = Field(..., ge=50, le=1000)
    summer_monthly_kwh:  float        = Field(0, ge=0, le=1000,
                              description="여름 월 평균 전력사용량(kWh). 입력 시 k_base 자동 도출.")
    season:              SeasonType   = "하계"

    # ── 증상(복수 선택 + 심각도 1~5) · 관리/이력 ──
    symptoms:            list[SymptomInput] = Field(default_factory=list,
                              description="증상 복수 선택. 빈 배열이면 '증상없음'으로 처리.")
    filter_clean_months: int          = Field(..., ge=0, le=60)
    repair_history_count: int         = Field(..., ge=0, le=10)

    # ── 우선순위: 비용/환경/편의 3축 (각 0~100, 최종점수 비중 50%) ──
    priority_cost_score:        Optional[int] = Field(None, ge=0, le=100, description="비용 중시 0~100")
    priority_env_score:         Optional[int] = Field(None, ge=0, le=100, description="환경 중시 0~100")
    priority_convenience_score: Optional[int] = Field(None, ge=0, le=100, description="편의 중시 0~100")

    # ── 신형 비교 기준(설문 마지막 화면) ──
    new_model_code: Optional[str] = Field(None, description="선택한 1등급 신형 모델코드. 지정 시 신형 baseline(월간소비전력량·판매가·구독료)으로 반영. data/new_models.json")

    # ── 레거시(과도기 하위호환 · 점진 폐기) ──
    symptom_type:      Optional[SymptomKeyLegacy] = Field(None, description="(레거시) 단일 증상 내부키")
    symptom_severity:  Optional[SeverityLegacy]   = Field(None, description="(레거시) 4단계 심각도")
    customer_priority: Optional[PriorityLegacy]   = Field(None, description="(레거시) 6모드 우선순위")
    ac_monthly_kwh_input: float = Field(0, ge=0, le=500,
                              description="에어컨 에너지효율 스티커의 월간소비전력량(kWh/월). "
                                          "입력 시(>0) 표 추정 대신 이 값을 K_AC 베이스로 사용. 0=미입력→표 추정.")
