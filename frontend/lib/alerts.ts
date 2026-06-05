// 등록된 가전(SavedDevice)에서 맥락 알림을 도출. (별도 알림 서버 없이 클라이언트 파생)
import type { SavedDevice } from "@/lib/myDevice";
import { getDevices } from "@/lib/myDevice";

export const PART_HOLD_YEARS = 8;     // 에어컨 부품 보유기간(연식 초과 알림 기준)
export const EXPECTED_LIFE = 16.7;    // 기대수명(KESIS HEPS 역산)

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

  // 등급 기반 교체 권장
  if (dev.grade === "E" || dev.grade === "D") {
    out.push({ id: `${dev.sessionId}-grade`, level: "warn", icon: "⚠️",
      title: `건강등급 ${dev.grade} — 점검 권장`, device: dev,
      body: `진단 결과 ${dev.grade}등급입니다. 1순위 추천은 “${dev.recommendation}”이에요.` });
  }
  return out;
}

export function allAlerts(): DeviceAlert[] {
  const order: Record<AlertLevel, number> = { warn: 0, info: 1 };
  return getDevices()
    .flatMap(alertsFor)
    .sort((a, b) => order[a.level] - order[b.level]);
}
