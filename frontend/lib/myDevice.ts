// 내 가전(에어컨) 로컬 등록 — 인증 백엔드 없이 시연용으로 localStorage에 저장.
// 진단 완료 시 결과 페이지에서 자동 upsert 되고, 홈 "내 에어컨" 카드와 /devices 목록이 읽는다.
export interface SavedDevice {
  sessionId:     string;
  product_type:  string;
  purchase_year: number;
  capacity_kw:   number;
  grade:         string;   // A~E
  score:         number;   // 건강점수
  recommendation:string;   // 1순위 추천 라벨
  form?:         string;   // 벽걸이 / 스탠드 추정(백엔드 도출)
  savedAt:       number;   // ms epoch
  // 알림 도출용(구버전 저장값엔 없을 수 있어 옵셔널)
  age_years?:    number;
  filter_months?:number;
  // 낭비 심화 알림 기준선(진단 시점 1회 고정 — 결과 재방문해도 불변)
  diagnosed_at?:      number;   // 최초 진단 시각(ms) — 방치 시 소비 증가 예측의 기준 시각
  energy_waste_ratio?:number;   // 진단 시 낭비율(0~1)
  ac_monthly_cost?:   number;   // 진단 시 에어컨 월 전기요금(원) — 추가 비용 추정용
  usage_months?:      number;   // 연 냉방 사용 개월수
}

const KEY = "ror_my_devices";

function read(): SavedDevice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedDevice[]) : [];
  } catch {
    return [];
  }
}

function write(list: SavedDevice[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  // 같은 탭 내 카드들이 즉시 갱신되도록 커스텀 이벤트 발행
  window.dispatchEvent(new Event("ror:devices"));
}

export function getDevices(): SavedDevice[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function getLatestDevice(): SavedDevice | null {
  return getDevices()[0] ?? null;
}

// ── 대표 에어컨(홈 카드에 노출할 기기) — 사용자가 직접 선택, 없으면 최신으로 폴백 ──
const PRIMARY_KEY = "ror_primary_device";

export function getPrimaryId(): string | null {
  const list = getDevices();
  if (!list.length) return null;
  let id: string | null = null;
  if (typeof window !== "undefined") {
    try { id = window.localStorage.getItem(PRIMARY_KEY); } catch {}
  }
  // 저장된 대표가 현재 목록에 있으면 그것, 없으면(삭제됐거나 미설정) 최신으로 폴백
  return id && list.some((d) => d.sessionId === id) ? id : list[0].sessionId;
}

export function getPrimaryDevice(): SavedDevice | null {
  const id = getPrimaryId();
  return id ? getDevices().find((d) => d.sessionId === id) ?? null : null;
}

export function setPrimaryDevice(sessionId: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(PRIMARY_KEY, sessionId); } catch {}
  window.dispatchEvent(new Event("ror:devices"));   // 홈 카드·목록 즉시 갱신
}

// sessionId 기준 upsert (재진단 시 같은 세션이면 갱신, 아니면 새 항목)
// 같은 세션 재저장 시 diagnosed_at(예측 기준 시각)은 최초값을 보존한다 —
// 결과 화면을 다시 열 때마다 savedAt이 갱신돼도 '방치 경과시간' 기준이 흔들리지 않도록.
export function saveDevice(d: SavedDevice) {
  const list = read();
  const prev = list.find((x) => x.sessionId === d.sessionId);
  const merged: SavedDevice = { ...d, diagnosed_at: prev?.diagnosed_at ?? d.diagnosed_at ?? d.savedAt };
  write(list.filter((x) => x.sessionId !== d.sessionId).concat(merged));
}

export function removeDevice(sessionId: string) {
  write(read().filter((x) => x.sessionId !== sessionId));
}
