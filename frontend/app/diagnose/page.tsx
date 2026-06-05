"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Sparkles, ArrowRight } from "lucide-react";
import { diagnose, SAMPLE_INPUT } from "@/lib/api";
import type { DiagnoseInput, SymptomLabel } from "@/lib/types";

const SYMPTOMS: SymptomLabel[] = ["성능저하", "소음", "냄새", "누수", "전기요금증가", "작동불량"];
const PRIORITY_AXES: { key: keyof DiagnoseInput; label: string; emoji: string }[] = [
  { key: "priority_cost_score", label: "비용 중시", emoji: "💰" },
  { key: "priority_env_score", label: "환경 중시", emoji: "🌱" },
  { key: "priority_convenience_score", label: "편의 중시", emoji: "🛠" },
];

export default function DiagnosePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<DiagnoseInput>(SAMPLE_INPUT);

  const set = (k: keyof DiagnoseInput, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleSymptom = (label: SymptomLabel) =>
    setForm((p) => {
      const has = p.symptoms.some((s) => s.type === label);
      return {
        ...p,
        symptoms: has
          ? p.symptoms.filter((s) => s.type !== label)
          : [...p.symptoms, { type: label, severity: 3 }],
      };
    });

  const setSeverity = (label: SymptomLabel, severity: number) =>
    setForm((p) => ({
      ...p,
      symptoms: p.symptoms.map((s) => (s.type === label ? { ...s, severity } : s)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await diagnose(form);
      router.push(`/result/${res.session_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-line bg-[#fbf8f6] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-crimson focus:bg-white transition-colors";
  const L = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[12.5px] font-bold text-ink-soft mb-1.5">{children}</label>
  );
  const Card = ({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) => (
    <section className={`rounded-[22px] bg-surface border border-line p-5 shadow-[var(--shadow-card)] reveal reveal-${n}`}>
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink mb-4">
        <span className="w-5 h-5 rounded-full bg-crimson text-white text-[11px] font-bold flex items-center justify-center">{n}</span>
        {title}
        {sub && <span className="text-[11px] font-medium text-muted">{sub}</span>}
      </h2>
      {children}
    </section>
  );

  return (
    <div>
      {/* App bar */}
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">진단 입력</h1>
        <span className="ml-auto text-[11px] text-muted">대략적인 값이면 OK</span>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* 1. 제품 */}
        <Card n="1" title="제품 정보">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <L>구매 연도</L>
              <input type="number" min={2000} max={2026} value={form.purchase_year}
                onChange={(e) => set("purchase_year", Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <L>냉방 용량</L>
              <select value={form.capacity_kw} onChange={(e) => set("capacity_kw", Number(e.target.value))} className={inputCls}>
                {["2.5", "3.6", "5.0"].map((c) => <option key={c} value={c}>{c} kW</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <L>계약 종류</L>
            <div className="grid grid-cols-2 gap-2">
              {(["고압", "저압"] as const).map((v) => (
                <button type="button" key={v} onClick={() => set("contract_type", v)}
                  className={`rounded-xl border py-2.5 text-[13px] font-bold transition-colors ${form.contract_type === v ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-ink-soft"}`}>
                  {v === "고압" ? "고압 (아파트)" : "저압 (빌라·원룸)"}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* 2. 사용 패턴 */}
        <Card n="2" title="사용 패턴">
          <div className="grid grid-cols-2 gap-3">
            <div><L>하루 사용시간 (h)</L><input type="number" min={1} max={24} value={form.daily_usage_hours} onChange={(e) => set("daily_usage_hours", Number(e.target.value))} className={inputCls} /></div>
            <div><L>연간 사용 개월</L><input type="number" min={1} max={12} value={form.usage_months} onChange={(e) => set("usage_months", Number(e.target.value))} className={inputCls} /></div>
          </div>
          <div className="mt-3">
            <L>여름 한 달 전기요금 (kWh)</L>
            <input type="number" min={0} max={1000} step={10} value={form.summer_monthly_kwh} onChange={(e) => set("summer_monthly_kwh", Number(e.target.value))} className={inputCls} />
            <p className="text-[11px] text-muted mt-1.5">에어컨 켜는 달 고지서 총량. 입력 시 에어컨 기여분을 자동 분리합니다.</p>
          </div>
        </Card>

        {/* 3. 증상 */}
        <Card n="3" title="증상" sub="복수 선택 · 심각도 1~5">
          <div className="space-y-2">
            {SYMPTOMS.map((label) => {
              const sel = form.symptoms.find((s) => s.type === label);
              return (
                <div key={label} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${sel ? "border-crimson/40 bg-[#fdeef4]" : "border-line"}`}>
                  <label className="flex-1 flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={!!sel} onChange={() => toggleSymptom(label)} />
                    <span className="text-[14px] font-semibold text-ink">{label}</span>
                  </label>
                  {sel && (
                    <select value={sel.severity} onChange={(e) => setSeverity(label, Number(e.target.value))}
                      className="rounded-lg border border-line bg-white px-2 py-1.5 text-[13px] font-bold text-crimson">
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}점</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">선택 안 하면 ‘증상없음’으로 진단합니다.</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><L>필터 미청소 (개월)</L><input type="number" min={0} max={60} value={form.filter_clean_months} onChange={(e) => set("filter_clean_months", Number(e.target.value))} className={inputCls} /></div>
            <div><L>최근 수리 (회)</L><input type="number" min={0} max={10} value={form.repair_history_count} onChange={(e) => set("repair_history_count", Number(e.target.value))} className={inputCls} /></div>
          </div>
        </Card>

        {/* 4. 우선순위 3축 */}
        <Card n="4" title="우선순위" sub="비용 / 환경 / 편의">
          <p className="text-[11.5px] text-muted mb-3 -mt-2">중요한 가치에 점수를 더 주세요. (미응답 시 비용 우선)</p>
          {PRIORITY_AXES.map(({ key, label, emoji }) => (
            <div key={key} className="mb-3.5 last:mb-0">
              <div className="flex justify-between text-[13px] mb-1">
                <span className="font-semibold text-ink-soft">{emoji} {label}</span>
                <span className="font-extrabold text-crimson" style={{ fontFamily: "var(--font-display)" }}>{form[key] as number}</span>
              </div>
              <input type="range" min={0} max={100} value={form[key] as number}
                onChange={(e) => set(key, Number(e.target.value))} className="w-full" />
            </div>
          ))}
        </Card>

        {error && (
          <div className="rounded-xl bg-[#fff2f2] border border-red-200 p-3 text-[13px] text-red-700">{error}</div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button type="button" onClick={() => setForm(SAMPLE_INPUT)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-[13px] font-bold text-ink-soft">
            <Sparkles size={16} /> 샘플
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl text-white font-extrabold py-3.5 text-[15px] shadow-[0_8px_20px_rgba(165,0,52,.28)] disabled:opacity-50 active:scale-[.99] transition-transform"
            style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
            {loading ? "분석 중…" : <>진단 시작 <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
