export type ProductType   = "에어컨" | "냉장고" | "세탁기" | "건조기";
// 증상 라벨(명세서 기준). "증상없음"은 아무것도 선택 안 한 상태로 처리.
export type SymptomLabel  = "증상없음"|"전기요금증가"|"냄새"|"소음"|"성능저하"|"누수"|"작동불량";
export type ContractType  = "고압"|"저압";
export type SeasonType    = "하계"|"기타";
export type GradeType     = "A"|"B"|"C"|"D"|"E";

export interface SymptomInput {
  type:     SymptomLabel;
  severity: number;        // 1~5점
}

export interface DiagnoseInput {
  product_type:               ProductType;
  purchase_year:              number;
  capacity_kw:                number;
  daily_usage_hours:          number;
  usage_months:               number;
  contract_type:              ContractType;
  summer_monthly_kwh:         number;   // 여름 고지서 총 kWh (0=미입력)
  base_monthly_kwh:           number;   // 기저 참고값 (k_base 도출 fallback)
  ac_monthly_kwh_input:       number;   // 에어컨 라벨 월간소비전력량 (0=미입력→표 추정)
  season:                     SeasonType;
  symptoms:                   SymptomInput[];   // 복수 선택 + 심각도 1~5
  filter_clean_months:        number;
  repair_history_count:       number;
  // 우선순위 비용/환경/편의 3축 (각 0~100)
  priority_cost_score:        number;
  priority_env_score:         number;
  priority_convenience_score: number;
  // 신형 비교 기준(설문 마지막 화면에서 선택한 1등급 신형 모델코드)
  new_model_code?:            string;
  // 진단 시 백엔드가 도출해 주입하는 추정 정보(저장 세션에 포함)
  form_estimated?:            string;   // 벽걸이 / 스탠드 추정
  selected_new_model?:        NewModel | null;   // 선택 신형 전체 정보(세션 영속화용으로 user_inputs에 stash)
}

export interface NewModelFeature { name: string; desc: string; }
export interface NewModel {
  model_code:  string;
  form:        string;   // 스탠드 / 벽걸이 / 창호형 / 이동식 (그룹)
  line:        string;   // 라인업명(예: "타워I")
  lineup?:     string;   // 원본 라인업명
  product_name?: string; // 대표모델 정식 제품명
  product_type_raw?: string; // 제품유형(예: "2in1 / 일반배관")
  cooling_area_m2?: number;  // 냉방면적
  pyeong:      number;   // 냉방 평수
  capacity_kw: number;
  monthly_kwh: number;   // 표준 월간소비전력량
  grade:       string;   // 효율등급(예: "1등급", 빈값=미표기)
  list_price:  number;
  sale_price:  number;   // 회원할인가
  max_benefit_price?: number;
  sub_fee:     number;   // 월 구독료(0=구독 미제공)
  tagline:     string;
  desc:        string;
  features:    NewModelFeature[];
  image:       string | null;
  product_url?: string;
}
export interface NewModelsResponse { items: NewModel[]; }

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
  form_estimated:       string;   // 벽걸이 / 스탠드 추정
  form_confidence:      string;   // high / medium / low
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
  elec_cost_5y?:      number;   // 5년 전기 비용(분해)
  option_cost_5y?:    number;   // 옵션 고유 비용 5년(수리/구독/구매/셀프)
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

export interface CatalogItem {
  model_name:   string;
  model_code:   string;
  capacity_kw:  number;   // 냉방능력 kW
  form:         string;   // 벽걸이 / 스탠드
  price:        number | null;   // 판매가(구매)
  list_price:   number | null;   // 정가(할인 표시용)
  monthly_fee:  number | null;   // 월 구독료
  product_url:  string;
}
export interface ProductsResponse {
  capacity_kw: number;
  kind:        "buy" | "sub";
  items:       CatalogItem[];
}

export interface OcrResult {
  source:           "vision" | "mock";
  monthly_kwh:      number | null;
  capacity_kw:      number | null;
  efficiency_grade: number | null;
  confidence:       "high" | "low" | "none";
  raw_text:         string;
  disclaimer?:      string;
}

export interface ServiceCenter {
  name:        string;
  region:      string;
  address:     string;
  repair:      string;
  note:        string;
  lat:         number | null;
  lng:         number | null;
  distance_km?:number;
}
export interface CentersResponse {
  regions:     string[];
  selected:    string;
  mode:        "region" | "nearby";
  count:       number;
  tel:         string;
  hours:       string;
  reserve_url: string;
  items:       ServiceCenter[];
}

export interface SessionData {
  user_inputs:    DiagnoseInput;
  diagnosis:      Record<string, number|string>;
  ranked_options: OptionScore[];
  carbon_summary: CarbonSummary;
  report:         Report;
  delta_old:      Record<string, number|string|boolean>;
  delta_new:      Record<string, number|string|boolean>;
  selected_new_model?: NewModel | null;   // 선택한 신형 비교 기준(없으면 null)
  new_kwh_source?:     string;            // "selected_model" / "eff_ratio"
  disclaimer?:    string;
}
