export type ProductType   = "에어컨" | "냉장고" | "세탁기" | "건조기";
export type SymptomType   = "이상없음"|"냄새"|"냉방약화"|"소음"|"전기료부담"|"누수"|"작동불가";
export type SeverityType  = "없음"|"낮음"|"중간"|"높음";
export type PriorityType  = "기본"|"비용절감"|"친환경"|"초기비용최소"|"관리편의"|"오래쓰기";
export type ContractType  = "고압"|"저압";
export type SeasonType    = "하계"|"기타";
export type GradeType     = "A"|"B"|"C"|"D"|"E";

export interface DiagnoseInput {
  product_type:              ProductType;
  purchase_year:             number;
  capacity_kw:               number;
  daily_usage_hours:         number;
  usage_months:              number;
  contract_type:             ContractType;
  summer_monthly_kwh:        number;   // 여름 고지서 총 kWh (0=미입력)
  base_monthly_kwh:          number;   // 기저 참고값 (k_base 도출 fallback)
  ac_monthly_kwh_input:      number;   // deprecated: 0 고정
  season:                    SeasonType;
  symptom_type:              SymptomType;
  symptom_severity:          SeverityType;
  filter_clean_months:       number;
  repair_history_count:      number;
  customer_priority:         PriorityType;
}

export interface DiagnoseResponse {
  session_id:           string;
  health_grade:         GradeType;
  health_score:         number;
  inspection_score_100: number;
  grade_description:    string;
  energy_waste_ratio:   number;
  inconvenience:        number;
  age_years:            number;
  bill_base_total:      number;
  ac_delta_old:         number;
  ac_delta_new:         number;
  tier_old:             string;
  tier_new:             string;
  tier_changed:         boolean;
  k_ac_old:             number;
  k_ac_new:             number;
  disclaimer:           string;
}

export interface OptionScore {
  key:                string;
  label:              string;
  three_year_cost:    number;
  initial_cost:       number;
  inspection_after:   number;
  energy_waste_after: number;
  carbon_total:       number;
  inconvenience_after:number;
  economy_score:      number;
  reliability_score:  number;
  carbon_score:       number;
  comfort_score:      number;
  initial_score:      number;
  final_score:        number;
  rank:               number;
  highlights:         string[];
}

export interface CarbonSummary {
  old_use_carbon_3y:    number;
  new_use_carbon_3y:    number;
  replace_proxy_carbon: number;
  repair_proxy_carbon:  number;
  carbon_payback_years: number;
  annual_carbon_saving: number;
}

export interface Report {
  recommendation_1st:  string;
  recommendation_2nd:  string;
  reason_summary:      string;
  confidence_cards:    string[];
  caution_notes:       string[];
  next_actions:        { label: string; action: string; icon: string }[];
  as_fast_pass_text:   string;
  family_share_summary:string;
}

export interface SessionData {
  user_inputs:    DiagnoseInput;
  diagnosis:      Record<string, number|string>;
  ranked_options: OptionScore[];
  carbon_summary: CarbonSummary;
  report:         Report;
  delta_old:      Record<string, number|string|boolean>;
  delta_new:      Record<string, number|string|boolean>;
}
