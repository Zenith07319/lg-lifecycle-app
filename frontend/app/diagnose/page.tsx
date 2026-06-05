"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { diagnose, SAMPLE_INPUT } from "@/lib/api";
import type { DiagnoseInput, SymptomLabel } from "@/lib/types";

const SYMPTOMS: SymptomLabel[] = ["성능저하", "소음", "냄새", "누수", "전기요금증가", "작동불량"];
const AXES: { key: keyof DiagnoseInput; label: string; emoji: string }[] = [
  { key: "priority_cost_score", label: "비용", emoji: "💰" },
  { key: "priority_env_score", label: "환경", emoji: "🌱" },
  { key: "priority_convenience_score", label: "편의", emoji: "🛠" },
];
const Q = [
  "안녕하세요! 진단할 에어컨의 기본 정보를 알려주세요. 🐧",
  "요즘 어떤 증상이 있나요? (여러 개 선택 가능)",
  "각 증상이 얼마나 심한가요? (1~5점)",
  "평소 사용 환경을 알려주세요.",
  "여름 전기요금과 관리 상태는요?",
  "마지막! 무엇을 가장 중요하게 보세요?",
];

export default function DiagnosePage() {
  const router = useRouter();
  const [form, setForm] = useState<DiagnoseInput>(SAMPLE_INPUT);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    return () => clearTimeout(t);
  }, [step]);

  const set = (k: keyof DiagnoseInput, v: string | number) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSymptom = (label: SymptomLabel) =>
    setForm((p) => {
      const has = p.symptoms.some((s) => s.type === label);
      return { ...p, symptoms: has ? p.symptoms.filter((s) => s.type !== label) : [...p.symptoms, { type: label, severity: 3 }] };
    });
  const setSeverity = (label: SymptomLabel, severity: number) =>
    setForm((p) => ({ ...p, symptoms: p.symptoms.map((s) => (s.type === label ? { ...s, severity } : s)) }));

  const next = () => setStep((s) => s + 1);
  const submit = async () => {
    setLoading(true); setError("");
    try { const res = await diagnose(form); router.push(`/result/${res.session_id}`); }
    catch (e) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); setLoading(false); }
  };
  const sampleFast = () => { setForm(SAMPLE_INPUT); setTimeout(submit, 60); };

  const summary = (i: number): string => {
    const f = form;
    switch (i) {
      case 0: return `${f.purchase_year}년식 · ${f.capacity_kw}kW · ${f.contract_type}` + (f.ac_monthly_kwh_input ? ` · ${f.ac_monthly_kwh_input}kWh/월` : "");
      case 1: return f.symptoms.length ? f.symptoms.map((s) => s.type).join(", ") : "증상 없음";
      case 2: return f.symptoms.length ? f.symptoms.map((s) => `${s.type} ${s.severity}점`).join(", ") : "해당 없음";
      case 3: return `하루 ${f.daily_usage_hours}시간 · 연 ${f.usage_months}개월`;
      case 4: return `여름 ${f.summer_monthly_kwh}kWh · 필터 ${f.filter_clean_months}개월 · 수리 ${f.repair_history_count}회`;
      case 5: {
        const a = [f.priority_cost_score, f.priority_env_score, f.priority_convenience_score];
        return ["비용", "환경", "편의"][a.reduce((mi, v, j, ar) => (v > ar[mi] ? j : mi), 0)] + " 우선";
      }
      default: return "";
    }
  };

  const inputCls = "w-full rounded-xl border border-line bg-[#fbf8f6] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-crimson focus:bg-white transition-colors";
  const lab = "text-[11.5px] font-bold text-ink-soft";
  const nextBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full mt-3 rounded-2xl text-white font-extrabold py-3 text-[14px] shadow-[0_6px_16px_rgba(165,0,52,.25)] disabled:opacity-50 active:scale-[.99] transition-transform"
      style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
      {label}
    </button>
  );

  const renderDock = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className={lab}>구매 연도</label><input type="number" min={2000} max={2026} value={form.purchase_year} onChange={(e) => set("purchase_year", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>냉방 용량</label><select value={form.capacity_kw} onChange={(e) => set("capacity_kw", Number(e.target.value))} className={inputCls}>{["2.5", "3.6", "5.0"].map((c) => <option key={c} value={c}>{c} kW</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {(["고압", "저압"] as const).map((v) => (
                <button key={v} onClick={() => set("contract_type", v)} className={`rounded-xl border py-2 text-[12.5px] font-bold ${form.contract_type === v ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-ink-soft"}`}>{v === "고압" ? "고압(아파트)" : "저압(빌라)"}</button>
              ))}
            </div>
            <div className="mt-2.5">
              <label className={lab}>월간소비전력량 (kWh/월)</label>
              <input type="number" min={0} max={500} step={1} value={form.ac_monthly_kwh_input || ""} placeholder="예: 110"
                onChange={(e) => set("ac_monthly_kwh_input", Number(e.target.value))} className={inputCls} />
              <p className="text-[10.5px] text-muted mt-1">에어컨 에너지효율 스티커 표기값</p>
            </div>
            {nextBtn("다음", next)}
          </div>
        );
      case 1:
        return (
          <div>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((label) => {
                const on = form.symptoms.some((s) => s.type === label);
                return <button key={label} onClick={() => toggleSymptom(label)} className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold ${on ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-ink-soft"}`}>{label}</button>;
              })}
            </div>
            {nextBtn(form.symptoms.length ? "다음" : "증상 없음 · 다음", next)}
          </div>
        );
      case 2:
        if (!form.symptoms.length) return <div className="text-[13px] text-muted">선택한 증상이 없어요.{nextBtn("다음", next)}</div>;
        return (
          <div className="space-y-3">
            {form.symptoms.map((s) => (
              <div key={s.type}>
                <p className="text-[12.5px] font-bold text-ink-soft mb-1.5">{s.type}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setSeverity(s.type, n)} className={`flex-1 rounded-lg border py-2 text-[13px] font-bold transition-colors ${s.severity === n ? "border-crimson bg-crimson text-white" : "border-line text-ink-soft"}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
            {nextBtn("다음", next)}
          </div>
        );
      case 3:
        return (
          <div>
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className={lab}>하루 사용시간(h)</label><input type="number" min={1} max={24} value={form.daily_usage_hours} onChange={(e) => set("daily_usage_hours", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>연간 사용 개월</label><input type="number" min={1} max={12} value={form.usage_months} onChange={(e) => set("usage_months", Number(e.target.value))} className={inputCls} /></div>
            </div>
            {nextBtn("다음", next)}
          </div>
        );
      case 4:
        return (
          <div>
            <label className={lab}>여름 한 달 전기요금(kWh)</label>
            <input type="number" min={0} max={1000} step={10} value={form.summer_monthly_kwh} onChange={(e) => set("summer_monthly_kwh", Number(e.target.value))} className={inputCls} />
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <div><label className={lab}>필터 미청소(개월)</label><input type="number" min={0} max={60} value={form.filter_clean_months} onChange={(e) => set("filter_clean_months", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>최근 수리(회)</label><input type="number" min={0} max={10} value={form.repair_history_count} onChange={(e) => set("repair_history_count", Number(e.target.value))} className={inputCls} /></div>
            </div>
            {nextBtn("다음", next)}
          </div>
        );
      case 5:
        return (
          <div>
            {AXES.map(({ key, label, emoji }) => (
              <div key={key as string} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[12.5px] mb-1">
                  <span className="font-semibold text-ink-soft">{emoji} {label} 중시</span>
                  <span className="font-extrabold text-crimson" style={{ fontFamily: "var(--font-display)" }}>{form[key] as number}</span>
                </div>
                <input type="range" min={0} max={100} value={form[key] as number} onChange={(e) => set(key, Number(e.target.value))} className="w-full" />
              </div>
            ))}
            {nextBtn(loading ? "분석 중…" : "진단 시작 →", submit, loading)}
          </div>
        );
      default:
        return null;
    }
  };

  const bot = (text: string, k: string) => (
    <div key={k} className="flex gap-2 items-start reveal">
      <div className="w-7 h-7 rounded-full bg-crimson text-white text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">R</div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-surface border border-line px-3.5 py-2.5 text-[13.5px] text-ink shadow-[var(--shadow-card)]">{text}</div>
    </div>
  );
  const me = (text: string, k: string) => (
    <div key={k} className="max-w-[82%] ml-auto rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13.5px] text-white reveal" style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>{text}</div>
  );

  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">챗봇 진단</h1>
        <span className="ml-auto text-[11px] text-muted">{Math.min(step + 1, Q.length)}/{Q.length}</span>
        <button onClick={sampleFast} className="text-[11px] font-bold text-crimson border border-crimson/40 rounded-full px-2.5 py-1">샘플</button>
      </div>

      <div className="px-4 py-4 space-y-2.5">
        {Array.from({ length: step }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            {bot(Q[i], `b${i}`)}
            {me(summary(i), `m${i}`)}
          </div>
        ))}
        {step < Q.length && bot(Q[step], "cur")}
        {error && <div className="rounded-xl bg-[#fff2f2] border border-red-200 p-3 text-[13px] text-red-700">{error}</div>}
        {step < Q.length && (
          <div className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)] mt-1 reveal">{renderDock()}</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
