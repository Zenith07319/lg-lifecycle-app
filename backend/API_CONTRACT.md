# ROR 백엔드 API 계약 (초안 v1)

> **목적**: 프론트엔드 ↔ 백엔드가 의존하는 **요청/응답 스키마(계약)**를 고정한다.
> 이 계약은 **계산 로직 내부(공식·상수값)와 분리**되어 있어, 로직이 바뀌어도 이 문서의 스키마는 유지된다.
> 기준 구현: `app/backend/app/routers/diagnose.py`, `app/models/request.py`, `services/calculation.py`.
> 작성 2026-06-04. **[합의 필요]** 표시는 프론트와 확정할 항목.

---

## 0. 공통

- Base URL: `/api`
- 형식: JSON (요청·응답 모두 `application/json`)
- 모든 응답에 면책 문구 포함: `"disclaimer": "현재 입력 조건 기준 추정 결과입니다. 정확한 고장 예측이 아닙니다."`
- 수치는 추정치. 금액 단위 = 원(KRW), 전력 = kWh, 기간 = 5년 기준.
- 인증: ThinQ 계정/세션은 ThinQ 책임(본 서비스 범위 밖). MVP는 무인증 또는 단순 토큰.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/diagnose` | 진단 실행 → 요약 결과 + `session_id` 반환 |
| `GET`  | `/api/session/{session_id}` | 진단 전체 결과 조회(5선택지·리포트 포함) |
| `GET`  | `/api/health` | 헬스체크 `{"status":"ok"}` |

---

## 1. `POST /api/diagnose` — 진단 실행

### 1-1. 요청 (현재 구현 기준)

```jsonc
{
  "product_type": "에어컨",            // 에어컨|냉장고|세탁기|건조기 (MVP=에어컨)
  "purchase_year": 2014,              // 2000~2026
  "capacity_kw": 3.6,                 // 0<x<=20 (정격 냉방능력)
  "daily_usage_hours": 8,             // 1~24 (실사용시간/일)
  "usage_months": 4,                  // 1~12 (연간 냉방 사용 개월)
  "contract_type": "고압",            // 고압|저압
  "base_monthly_kwh": 350,            // 50~1000 (기저 참고값/겨울 고지서)
  "summer_monthly_kwh": 460,          // 0~1000 (여름 월 고지서 총 kWh; 입력 시 k_base 자동도출)
  "season": "하계",                   // 하계|기타
  "symptom_type": "냉방약화",         // [합의 필요] 아래 §1-3 라벨 매핑 참조
  "symptom_severity": "중간",         // [합의 필요] 현재 없음|낮음|중간|높음 → 1~5점 전환 예정
  "filter_clean_months": 8,           // 0~60 (필터 미청소 경과 월수)
  "repair_history_count": 1,          // 0~10 (수리 이력 횟수)
  "customer_priority": "기본"         // [합의 필요] 6모드 → 3축 전환 예정 (§1-2)
  // "ac_monthly_kwh_input": 0        // (deprecated) 사용 금지, 0 고정
}
```

### 1-2. [합의 필요] 우선순위 입력 — 6모드 → **비용/환경/편의 3축**

확정 로직은 **3축 점수화(각 0~100, 비중 50%)**다. 계산 엔진(`scoring_v2.priority_weights_from_axes`)은 이미 3축을 지원하므로, 요청 필드를 아래로 교체 권장:

```jsonc
// 권장(신규) — customer_priority(문자열) 대신
"priority_cost_score": 70,           // 0~100 비용 중시
"priority_env_score": 20,            // 0~100 환경 중시
"priority_convenience_score": 10     // 0~100 편의 중시
// 미응답(모두 0/생략) → 비용 우선 폴백
```
> 과도기: 백엔드가 둘 다 받게 하고(3축 우선, 없으면 customer_priority), 프론트 전환 완료 후 6모드 제거.

### 1-3. [합의 필요] 증상 — 명세서 라벨 + 복수 선택 + 심각도 1~5

- **라벨 매핑**(프론트는 명세서 라벨 노출, 백엔드 내부키로 변환):

| 명세서 라벨(프론트) | 내부키(현재 API) |
|------|------|
| 증상없음 | 이상없음 |
| 전기요금증가 | 전기료부담 |
| 성능저하 | 냉방약화 |
| 작동불량 | 작동불가 |
| 소음 / 냄새 / 누수 | (동일) |

- **복수 증상 + 심각도 1~5**(확정): 단일 `symptom_type`/`symptom_severity` → 배열로 전환 권장:
```jsonc
"symptoms": [
  { "type": "전기요금증가", "severity": 4 },   // severity 1~5
  { "type": "소음",        "severity": 2 }
]
```
> 현재 코드는 단일 증상 + 4단계(없음/낮음/중간/높음). 5점 척도·복수 증상은 마이그레이션 대상(심각도 5점 배율은 §미확정).

### 1-4. 응답 (요약)

```jsonc
{
  "session_id": "uuid",
  "health_grade": "C",                 // A~E
  "health_score": 58.3,                // 0~100 (높을수록 건강)
  "inspection_score_100": 47.0,        // 점검 필요도 0~100
  "grade_description": "점검 권장 — 수리 또는 정밀 진단 필요",
  "energy_waste_ratio": 0.42,          // 신제품 대비 초과 소비 비율
  "inconvenience": 0.55,               // 생활불편도 0~1
  "age_years": 12,
  "bill_base_total": 51230,            // 기저(에어컨 제외) 월 청구액
  "ac_delta_old": 64693,              // 구형 에어컨 월 기여 요금
  "ac_delta_new": 17101,              // 신형 에어컨 월 기여 요금
  "tier_old": 3, "tier_new": 2,        // 누진 구간
  "tier_changed": true,                // 누진 구간 이동 여부
  "k_ac_old": 232.0, "k_ac_new": 80.0, // 에어컨 월 소비전력량(kWh)
  "disclaimer": "현재 입력 조건 기준 추정 결과입니다. 정확한 고장 예측이 아닙니다."
}
```

---

## 2. `GET /api/session/{session_id}` — 전체 결과

요약 + **5선택지 비교 + 리포트**까지 포함. 만료(기본 24h) 시 `404`.

```jsonc
{
  "diagnosis": {
    "age_years": 12, "age_score": 0.719,
    "inspection_score": 0.47, "inspection_score_100": 47.0,
    "inconvenience": 0.55,
    "energy_waste_ratio": 0.42, "energy_waste_kwh_annual": 540.0,
    "health_grade": "C", "health_score": 58.3, "grade_description": "..."
  },
  "ranked_options": [
    {
      "key": "신제품구매", "label": "신제품 구매", "rank": 1,
      "three_year_cost": 1406515,        // ※ 레거시명, 실제 = 5년 총비용 → 프론트 노출은 total_cost_5y 권장
      "initial_cost": 1150000,
      "final_score": 0.78,
      "economy_score": 0.62, "reliability_score": 0.95,
      "carbon_score": 0.40, "comfort_score": 0.98, "initial_score": 0.10,
      "energy_waste_after": 0.0, "inspection_after": 0.03,
      "carbon_total": 612.0, "inconvenience_after": 0.02,
      "highlights": ["탄소 회수 4.2년·에너지낭비 42% — 신제품 구매가 장기적으로 유리"]
    }
    // ... 5개 (rank 1~5)
  ],
  "carbon_summary": {
    "old_use_carbon_3y": 532.0, "new_use_carbon_3y": 186.0,
    "replace_proxy_carbon": 113.0, "repair_proxy_carbon": 15.0,
    "carbon_payback_years": 4.2, "annual_carbon_saving": 69.2
  },
  "report": {
    "recommendation_1st": "신제품 구매", "recommendation_2nd": "수리 후 사용",
    "reason_summary": "...", "confidence_cards": ["📅 12년 사용 — 기대수명(16.7년)의 72% 경과", "..."],
    "caution_notes": ["..."], "next_actions": [{ "label": "...", "type": "..." }],
    "as_fast_pass_text": "...", "family_share_summary": "..."
  },
  "k_ac_old": 232.0, "k_ac_new": 80.0, "k_base": 350.0,
  "current_eff": 0.675, "rerep_prob": 0.31,
  "parts_exceeded": true, "parts_expiry_year": 2022,
  "disclaimer": "..."
}
```

### 2-1. 5선택지 `key` 고정값
`계속사용 / 셀프케어 / 수리후사용 / 구독전환 / 신제품구매` (BR-03, 고정).

### 2-2. 필드 의미 레퍼런스

| 필드 | 의미 |
|------|------|
| `three_year_cost` | **5년 총비용**(레거시 필드명 — rename 대상; 프론트는 `total_cost_5y`로 표기 권장) |
| `final_score` 0~1 | 가중치 기반 최종 점수(높을수록 추천). LLM 예측 아님 |
| `economy/reliability/carbon/comfort/initial_score` | 5개 지표별 정규화 점수(0~1) |
| `carbon_payback_years` | 교체 탄소 회수기간(년). 3년↓ 교체 합리 / 7년↑ 수리·셀프케어 유리 |
| `parts_exceeded` | 부품보유기간(에어컨 8년) 초과 여부 → 수리후사용 패널티 |

---

## 3. 에러

| 코드 | 상황 |
|------|------|
| `422` | 요청 필드 검증 실패(Pydantic) |
| `404` | 세션 없음/만료 |
| `500` | 계산 파이프라인 오류(`detail`에 메시지) |

---

## 4. 프론트와 먼저 합의할 4가지 (계약 고정 포인트)
1. **우선순위 = 3축**(`priority_*_score` 0~100) 채택 시점 — 6모드 제거 일정
2. **증상 = 명세서 라벨 + 복수 선택 + 심각도 1~5** 배열(`symptoms[]`)
3. **`three_year_cost` → `total_cost_5y`** 노출 명칭 통일
4. **응답 필드 집합 동결** — 위 §1-4 / §2 스키마를 프론트 화면(건강등급 카드·전기요금 카드·5선택지·리포트)과 1:1 매핑 확인

> 내부 공식·상수(심각도 배율, 비용 기준값, 노후화율, VOC 점수 등)는 이 계약과 **무관하게** 바뀔 수 있다 — 응답 *구조*만 고정하면 프론트는 영향 없음.
