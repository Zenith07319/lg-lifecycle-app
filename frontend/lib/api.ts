import { DiagnoseInput, DiagnoseResponse, SessionData, ProductsResponse, CentersResponse } from "./types";

// 환경변수 입력 경로(PowerShell 등)에서 값 앞뒤에 BOM/제로폭 문자가 섞이면
// 절대 URL이 깨져 요청이 프론트 도메인으로 새는 사고가 난다. 보이지 않는 문자를
// 제거하고 trim 하여 항상 깨끗한 base URL을 보장한다.
const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://lg-lifecycle-production.up.railway.app";
const API_BASE = RAW_API_BASE.replace(/[﻿​‌‍⁠]/g, "").trim();

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

export const getProducts = (capacityKw: number, kind: "buy" | "sub") =>
  apiFetch<ProductsResponse>(`/api/products?capacity_kw=${capacityKw}&kind=${kind}`);

export const getCenters = (region = "") =>
  apiFetch<CentersResponse>(`/api/centers${region ? `?region=${encodeURIComponent(region)}` : ""}`);

export const getCentersNearby = (lat: number, lng: number, limit = 10) =>
  apiFetch<CentersResponse>(`/api/centers?lat=${lat}&lng=${lng}&limit=${limit}`);

export const SAMPLE_INPUT: DiagnoseInput = {
  product_type: "에어컨",
  purchase_year: 2014,
  capacity_kw: 3.6,
  daily_usage_hours: 8,
  usage_months: 4,
  contract_type: "고압",
  summer_monthly_kwh: 460,  // 여름 고지서 총량
  base_monthly_kwh: 350,    // 기저 fallback
  ac_monthly_kwh_input: 110, // 에어컨 라벨 월간소비전력량(스티커값)
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
