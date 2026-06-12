# Figma 원본 화면 코드 (팀 업로드 · 복구본)

팀원이 Figma에 구현한 ROR × LG ThinQ 전체 UI. 원본은 **절대좌표 390×844 + 디자인토큰**(Figma "Copy as Code"). 우리 앱 프론트는 이걸 **반응형 Tailwind + 실데이터**로 이식한다.

> ⚠️ 이 폴더는 이전에 데스크톱 스크래치로만 있다가 삭제됐고, 채팅 transcript(2026-06-12 업로드분)에서 **복구**해 레포에 영구 저장한 것이다. 절대 지우지 말 것.

## 이식 3원칙
1. 절대좌표 → 반응형 Tailwind (flex/grid)
2. placehold.co / 하드코딩 텍스트 → **우리 백엔드 실데이터** 연결 (기존 page.tsx의 API·hook 보존)
3. Figma 손그림 SVG outline div → `lucide-react` 아이콘으로 치환

## 디자인 토큰 (globals.css와 일치)
accent `#047D86` · accent-soft `#EEF8F7` · success `#3DA866` · green-050 `#EEF8E9` ·
warning `#F0A100` · warn-bg `#FDF3DF` · danger `#C23630` · lg-red `#A50034`(LG연계 뱃지 전용) ·
ink `#1A1C21` · muted `#8C949E` · line `#ECECED` · bg `#ECEDED`. Font=Pretendard.

## 화면 ↔ 라우트 매핑 + 이식 상태
| Figma | 파일 | 라우트 | 상태 |
|---|---|---|---|
| 01-2/3/4 Home | `1-2/1-3/1-4_home_*.jsx` | `/` | ✅ Figma 재구축 |
| 02-1~6 진단 | `2-1~2-6_diagnose_*.jsx` | `/diagnose` | ⚠️ 색만(로직보존 승인됨) |
| 03-3/4 내 가전 | `3-3_devices.jsx`, `3-4_devices_empty.jsx` | `/devices` | 🔧 재구축 대상 |
| 04-2 결과상세 | `4-2_result_detail.jsx` | `/result/[id]` | ✅ Figma 재구축 |
| 04-1 판단근거 | `4-1_result_basis.jsx` | `/result/[id]/basis` | ✅ Figma 재구축 |
| 04-3~7 결정가이드 | `4-3~4-7_guide_rank*.jsx` | `/result/[id]/guide` | ✅ Figma 재구축(셀렉터) |
| 06-1 더보기 | `6-1_more.jsx` | `/more` | 🔧 재구축 대상 |
| 07-1 알림 | `7-1_notifications.jsx` | `/notifications` | 🔧 재구축 대상 |
| 07-2 관리가이드 | `7-2_care_guide.jsx` | `/guide` | 🔧 재구축 대상 |
| 07-3 A/S FastPass | `7-3_fastpass.jsx` | `/fastpass/[id]` | 🔧 재구축 대상 |
| 07-4 서비스센터 | `7-4_centers.jsx` | `/centers` | 🔧 재구축 대상 |
| 07-5/6 추천신제품 | `7-5_products_buy_open.jsx`, `7-6_products_buy_close.jsx` | `/products/[id]`(구매탭) | 🔧 재구축 대상 |
| 07-7/8 구독상품 | `7-7_products_sub_close.jsx`, `7-8_products_sub_open.jsx` | `/products/[id]`(구독탭) | 🔧 재구축 대상 |

✅=Figma 레이아웃대로 재구축 / ⚠️=색만 틸 교체 / 🔧=충실 재구축 진행 중
