from pydantic import BaseModel, Field
from typing import Literal

SymptomType = Literal["이상없음","냄새","냉방약화","소음","전기료부담","누수","작동불가"]
SeverityType = Literal["없음","낮음","중간","높음"]
PriorityType = Literal["기본","비용절감","친환경","초기비용최소","관리편의","오래쓰기"]
ProductType  = Literal["에어컨","냉장고","세탁기","건조기"]
ContractType = Literal["고압","저압"]
SeasonType   = Literal["하계","기타"]

class DiagnoseRequest(BaseModel):
    product_type:           ProductType  = "에어컨"
    purchase_year:          int          = Field(..., ge=2000, le=2026)
    capacity_kw:            float        = Field(..., gt=0, le=20)
    daily_usage_hours:      float        = Field(..., ge=1, le=24)
    usage_months:           int          = Field(..., ge=1, le=12)
    contract_type:          ContractType = "고압"
    base_monthly_kwh:       float        = Field(..., ge=50, le=1000)
    summer_monthly_kwh:     float        = Field(0, ge=0, le=1000,
                                description="여름 월 평균 전력사용량(kWh). 입력 시 k_base 자동 도출.")
    ac_monthly_kwh_input:   float        = Field(0, ge=0, le=500,
                                description="(deprecated) 0으로 고정. 효율감퇴 모델로 대체.")
    season:                 SeasonType   = "하계"
    symptom_type:           SymptomType  = "이상없음"
    symptom_severity:       SeverityType = "없음"
    filter_clean_months:    int          = Field(..., ge=0, le=60)
    repair_history_count:   int          = Field(..., ge=0, le=10)
    customer_priority:      PriorityType = "기본"
