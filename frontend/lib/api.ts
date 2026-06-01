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
  base_monthly_kwh: 350,
  season: "하계",
  symptom_type: "냉방약화",
  symptom_severity: "중간",
  filter_clean_months: 9,
  repair_history_count: 1,
  customer_priority: "비용절감",
};
