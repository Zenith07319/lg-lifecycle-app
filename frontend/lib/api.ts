import { DiagnoseInput, DiagnoseResponse, SessionData } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://lg-lifecycle-production.up.railway.app";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

export const diagnose = (payload: DiagnoseInput) =>
  apiFetch<DiagnoseResponse>("/api/diagnose", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getSession = (sessionId: string) =>
  apiFetch<SessionData>(`/api/session/${sessionId}`);

export const SAMPLE_INPUT: DiagnoseInput = {
  product_type: "에어컨",
  purchase_year: 2014,
  capacity_kw: 3.6,
  daily_usage_hours: 8,
  usage_months: 4,
  contract_type: "고압",
  summer_monthly_kwh: 460,  // 여름 고지서 총량
  base_monthly_kwh: 350,    // 기저 fallback
  season: "하계",
  symptoms: [
    { type: "성능저하", severity: 4 },
    { type: "냄새", severity: 2 },
  ],
  filter_clean_months: 9,
  repair_history_count: 1,
  priority_cost_score: 70,
  priority_env_score: 20,
  priority_convenience_score: 10,
};
