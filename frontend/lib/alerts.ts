// 등록된 가전(SavedDevice)에서 맥락 알림을 도출. (별도 알림 서버 없이 클라이언트 파생)
import type { SavedDevice } from "@/lib/myDevice";
import { getDevices } from "@/lib/myDevice";

export const PART_HOLD_YEARS = 8;     // 에어컨 부품 보유기간(연식 초과 알림 기준)
export const EXPECTED_LIFE = 16.7;    // 기대수명(KESIS HEPS 역산)

// ── 에너지 낭비 심화 알림(방치 시 전력 소비 증가) ───────────────────────────
// 진단 시 낭비율을 기준선으로, 청소·수리 없이 방치하면 FSEC 2018 중앙값 5.2%/년으로
// 효율이 더 떨어진다고 보고 '전력 소비 증가율'을 예측한다. 소비가 +10%씩 늘 때마다 알림.
// 엔진 정의상 낭비율 = block/100(정확) → 소비 증가배수 = (1+block_t/100)/(1+block_0/100).
// (block_t = block_0 + 5.2 × 경과연수, 효율 바닥에서 상한)
export const WASTE_DRIFT_PCT_PER_YEAR = 5.2;   // 방치 시 연 효율 열화(FSEC 2018 총 중앙값)
const WASTE_BLOCK_FLOOR = 57.5;                // 효율 바닥(EFF_FLOOR 0.635) → 1/0.635 − 1 = 0.575
const WASTE_STEP_PCT   = 10;                   // 소비 +10%마다 1회 알림(래칫)
const WASTE_MIN_DAYS   = 60;                   // 진단 직후 유예(노이즈 방지)
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export type AlertLevel = "warn" | "info";
export interface DeviceAlert {
  id:    string;
  level: AlertLevel;
  icon:  string;
  title: string;
  body:  string;
  device: SavedDevice;
}

function ageOf(dev: SavedDevice): number {
  if (typeof dev.age_years === "number") return dev.age_years;
  return Math.max(0, new Date().getFullYear() - dev.purchase_year);
}

export function alertsFor(dev: SavedDevice): DeviceAlert[] {
  const out: DeviceAlert[] = [];
  const age = ageOf(dev);
  const name = `${dev.product_type}(${dev.purchase_year})`;

  // 부품 보유기간
  if (age >= PART_HOLD_YEARS) {
    out.push({ id: `${dev.sessionId}-part`, level: "warn", icon: "🛠",
      title: "부품 보유기간 초과", device: dev,
      body: `${name}은 사용 ${age}년차로 부품 보유기간(${PART_HOLD_YEARS}년)을 넘겨 수리 부품 확보가 어려울 수 있어요.` });
  } else if (age >= PART_HOLD_YEARS - 2) {
    out.push({ id: `${dev.sessionId}-part`, level: "info", icon: "🛠",
      title: "부품 보유기간 임박", device: dev,
      body: `사용 ${age}년차 — 부품 보유기간(${PART_HOLD_YEARS}년) 도래 전, 수리·교체 판단을 미리 점검해 보세요.` });
  }

  // 기대수명
  if (age >= EXPECTED_LIFE) {
    out.push({ id: `${dev.sessionId}-life`, level: "warn", icon: "📈",
      title: "기대수명 도달", device: dev,
      body: `평균 기대수명(약 ${EXPECTED_LIFE}년)에 도달했어요. 고효율 신제품 교체 시 전기료 절감 효과가 큽니다.` });
  } else if (age >= EXPECTED_LIFE - 4) {
    out.push({ id: `${dev.sessionId}-life`, level: "info", icon: "📈",
      title: "교체 검토 시점 접근", device: dev,
      body: `기대수명(약 ${EXPECTED_LIFE}년) 후반부에 들어섰어요. 여름 성수기 전 상태를 확인해 두면 좋아요.` });
  }

  // 필터 관리
  if (typeof dev.filter_months === "number" && dev.filter_months >= 6) {
    out.push({ id: `${dev.sessionId}-filter`, level: "info", icon: "🌬",
      title: "필터 청소 권장", device: dev,
      body: `필터를 청소한 지 ${dev.filter_months}개월 됐어요. 청소만으로 전기요금·냄새가 개선될 수 있어요.` });
  }

  // 등급 기반 점검 권장 — 1순위 추천 액션을 그대로 안내(결과·가이드와 동일 결론).
  // 부품 보유기간이 지난 상태에서 '수리'가 추천이면, 모순으로 읽히지 않게 caveat로 연결한다.
  if (dev.grade === "E" || dev.grade === "D") {
    const recIsRepair = (dev.recommendation || "").includes("수리");
    const partsCaveat = age >= PART_HOLD_YEARS && recIsRepair
      ? " 다만 부품 보유기간이 지나, 수리 전 부품 수급을 먼저 확인하세요."
      : "";
    out.push({ id: `${dev.sessionId}-grade`, level: "warn", icon: "⚠️",
      title: `건강등급 ${dev.grade} — 점검 권장`, device: dev,
      body: `진단 결과 ${dev.grade}등급입니다. 1순위 추천은 “${dev.recommendation}”이에요.${partsCaveat}` });
  }

  // 에너지 낭비 심화 — 진단 기준선 대비, 방치 시 전력 소비가 +10% 늘 때마다 경고.
  //   (기대수명 도달 기기는 위 '기대수명/교체' 알림이 맡으므로 제외 → 메시지 중복 방지)
  if (typeof dev.energy_waste_ratio === "number" && age < EXPECTED_LIFE) {
    const block0 = dev.energy_waste_ratio * 100;                       // 낭비율 = block/100
    const baseAt = dev.diagnosed_at ?? dev.savedAt;
    // 시연용 가속: localStorage.ror_demo_waste = "2.5" → 경과 2.5년으로 강제(데모에서 팝업 확인)
    const demo = typeof window !== "undefined" ? Number(window.localStorage.getItem("ror_demo_waste")) : 0;
    const years = demo > 0 ? demo : Math.max(0, (Date.now() - baseAt) / MS_PER_YEAR);
    if (years * 365.25 >= WASTE_MIN_DAYS) {
      const blockT  = Math.min(block0 + WASTE_DRIFT_PCT_PER_YEAR * years, WASTE_BLOCK_FLOOR);
      const risePct = ((1 + blockT / 100) / (1 + block0 / 100) - 1) * 100;   // 전력 소비 증가율(%)
      const step    = Math.floor(risePct / WASTE_STEP_PCT);                  // 1=+10%, 2=+20% …
      if (step >= 1) {
        const shown = step * WASTE_STEP_PCT;
        const extra = (typeof dev.ac_monthly_cost === "number" && typeof dev.usage_months === "number")
          ? Math.round(dev.ac_monthly_cost * dev.usage_months * (shown / 100)) : 0;
        const wonTxt = extra > 0 ? ` 한 시즌이면 약 ₩${extra.toLocaleString("ko-KR")}을 더 쓰는 셈이에요.` : "";
        out.push({ id: `${dev.sessionId}-wasteup-${step}`, level: "warn", icon: "💸",
          title: `방치 중 전기 소비 +${shown}%`, device: dev,
          body: `진단 이후 그대로 두면서 노후가 진행돼, 냉방 전기 소비가 약 +${shown}% 늘어난 것으로 추정돼요.${wonTxt} 지금 필터·코일을 청소하면 상당 부분 되돌릴 수 있어요(영구 노화는 연 1.5% 수준).` });
      }
    }
  }
  return out;
}

// ── 알림 삭제(확인 후 숨김) — 별도 서버 없이 dismissed id를 localStorage에 저장 ──
const DISMISS_KEY = "ror_dismissed_alerts";

function dismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(window.localStorage.getItem(DISMISS_KEY) || "[]") as string[]); }
  catch { return new Set(); }
}
function saveDismissed(s: Set<string>) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...s])); } catch {}
  window.dispatchEvent(new Event("ror:devices"));   // 알림 화면·홈 배지 즉시 갱신
}

export function dismissAlert(id: string) {
  const s = dismissedSet(); s.add(id); saveDismissed(s);
}
export function dismissAllAlerts() {
  const s = dismissedSet();
  getDevices().flatMap(alertsFor).forEach((a) => s.add(a.id));
  saveDismissed(s);
}

export function allAlerts(): DeviceAlert[] {
  const order: Record<AlertLevel, number> = { warn: 0, info: 1 };
  const dismissed = dismissedSet();
  return getDevices()
    .flatMap(alertsFor)
    .filter((a) => !dismissed.has(a.id))
    .sort((a, b) => order[a.level] - order[b.level]);
}

// ── 낭비 심화 '팝업' 1회 노출 관리 ──────────────────────────────────────────
// 팝업을 닫아도 알림함(notifications)엔 그대로 남도록, '삭제'와 별개의 seen 집합을 쓴다.
const SEEN_KEY = "ror_seen_popups";
function seenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]") as string[]); }
  catch { return new Set(); }
}
export function markPopupSeen(id: string) {
  if (typeof window === "undefined") return;
  const s = seenSet(); s.add(id);
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch {}
  window.dispatchEvent(new Event("ror:devices"));
}
// 아직 팝업으로 안 띄운 '낭비 심화' 경고 1건(없으면 null) — 삭제된 알림은 제외(allAlerts 기준)
export function pendingWastePopup(): DeviceAlert | null {
  const seen = seenSet();
  return allAlerts().find((a) => a.id.includes("-wasteup-") && !seen.has(a.id)) ?? null;
}
