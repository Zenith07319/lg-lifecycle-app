"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Loader2, Snowflake } from "lucide-react";
import { diagnose, ocrEnergyLabel, SAMPLE_INPUT } from "@/lib/api";
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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";              // 같은 파일 재선택 허용
    if (!f) return;
    setOcrLoading(true); setOcrMsg("");
    try {
      const r = await ocrEnergyLabel(f);
      const parts: string[] = [];
      const patch: Partial<DiagnoseInput> = {};
      if (r.monthly_kwh) { patch.ac_monthly_kwh_input = r.monthly_kwh; parts.push(`월간소비전력량 ${r.monthly_kwh}kWh`); }
      if (r.capacity_kw) { patch.capacity_kw = r.capacity_kw; parts.push(`냉방용량 ${r.capacity_kw}kW`); }
      if (parts.length) setForm((p) => ({ ...p, ...patch }));
      setOcrMsg(parts.length
        ? `📷 인식됨: ${parts.join(" · ")}${r.source === "mock" ? " (샘플)" : ""} — 값을 확인하고 진행하세요`
        : "사진에서 값을 못 읽었어요. 또렷하게 다시 찍거나 직접 입력해 주세요.");
    } catch {
      setOcrMsg("인식에 실패했어요. 직접 입력해 주세요.");
    } finally { setOcrLoading(false); }
  };

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

  const inputCls = "w-full rounded-xl border border-line bg-white/70 px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-300 focus:border-accent focus:bg-white transition-colors";
  const lab = "text-[11.5px] font-bold text-ink-soft";
  const nextBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full mt-3 rounded-full bg-accent text-white font-extrabold py-3 text-[14px] shadow-[0_6px_16px_rgba(4,125,134,.28)] disabled:opacity-50 active:scale-[.99] transition-transform">
      {label}
    </button>
  );

  const renderDock = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent-soft text-accent font-extrabold py-2.5 text-[13px] mb-2.5 disabled:opacity-50">
              {ocrLoading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              {ocrLoading ? "라벨 인식 중…" : "에너지효율 라벨로 자동 입력"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onOcrFile} />
            {ocrMsg && <p className="text-[11.5px] text-ink-soft bg-accent-soft border border-accent/25 rounded-lg px-3 py-2 mb-2.5">{ocrMsg}</p>}
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className={lab}>구매 연도</label><input type="number" min={1992} max={2026} placeholder="직접입력" value={form.purchase_year} onChange={(e) => set("purchase_year", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>냉방 용량(kW)</label><input type="number" min={1.5} max={20} step={0.1} placeholder="직접입력" value={form.capacity_kw} onChange={(e) => set("capacity_kw", Number(e.target.value))} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {(["고압", "저압"] as const).map((v) => (
                <button key={v} onClick={() => set("contract_type", v)} className={`rounded-xl border py-2 text-[12.5px] font-bold transition-colors ${form.contract_type === v ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft"}`}>{v === "고압" ? "고압(아파트)" : "저압(빌라)"}</button>
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
            <p className="text-[11px] font-semibold text-muted mb-2">증상 선택 · 중복 선택 가능</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((label) => {
                const on = form.symptoms.some((s) => s.type === label);
                return <button key={label} onClick={() => toggleSymptom(label)} className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft"}`}>{label}</button>;
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
                    <button key={n} onClick={() => setSeverity(s.type, n)} className={`flex-1 rounded-lg border py-2 text-[13px] font-bold transition-colors ${s.severity === n ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}>{n}</button>
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
              <div><label className={lab}>하루 사용시간(h)</label><input type="number" min={1} max={24} placeholder="직접입력" value={form.daily_usage_hours} onChange={(e) => set("daily_usage_hours", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>연간 사용 개월</label><input type="number" min={1} max={12} placeholder="직접입력" value={form.usage_months} onChange={(e) => set("usage_months", Number(e.target.value))} className={inputCls} /></div>
            </div>
            {nextBtn("다음", next)}
          </div>
        );
      case 4:
        return (
          <div>
            <label className={lab}>여름 한 달 전기요금(kWh)</label>
            <input type="number" min={0} max={1000} step={10} placeholder="직접입력" value={form.summer_monthly_kwh} onChange={(e) => set("summer_monthly_kwh", Number(e.target.value))} className={inputCls} />
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <div><label className={lab}>필터 미청소(개월)</label><input type="number" min={0} max={60} placeholder="직접입력" value={form.filter_clean_months} onChange={(e) => set("filter_clean_months", Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lab}>최근 수리(회)</label><input type="number" min={0} max={10} placeholder="직접입력" value={form.repair_history_count} onChange={(e) => set("repair_history_count", Number(e.target.value))} className={inputCls} /></div>
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
                  <span className="font-extrabold text-accent" style={{ fontFamily: "var(--font-display)" }}>{form[key] as number}</span>
                </div>
                <input type="range" min={0} max={100} value={form[key] as number} onChange={(e) => set(key, Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
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
      <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shrink-0 mt-0.5">
        <Snowflake size={15} strokeWidth={2.4} />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white/85 border border-line px-3.5 py-2.5 text-[13.5px] text-ink shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">{text}</div>
    </div>
  );
  const me = (text: string, k: string) => (
    <div key={k} className="max-w-[82%] ml-auto rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-[13.5px] text-white shadow-[0_4px_12px_rgba(4,125,134,.22)] reveal">{text}</div>
  );

  /* 02-6 분석 중 전용 화면 */
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-10 text-center">
        <div className="relative flex size-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-4 border-accent-soft" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent" />
          <Snowflake size={34} className="text-accent" strokeWidth={2.2} />
        </div>
        <p className="mt-8 text-[13px] font-medium text-muted">잠시만요,</p>
        <p className="mt-1 text-[19px] font-extrabold text-ink">결과를 분석하고 있어요</p>
        <p className="mt-2 text-[12px] text-muted">입력하신 정보로 5가지 시나리오를 비교 중이에요</p>
        <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-accent-soft">
          <span className="block h-full w-1/2 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
        <style>{`@keyframes loadbar{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-20 bg-paper/80 backdrop-blur-md border-b border-line/70 px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-ink-soft" aria-label="홈"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-bold text-ink">가전 진단</h1>
        <span className="ml-auto rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">{Math.min(step + 1, Q.length)}/{Q.length}</span>
        <button onClick={sampleFast} className="text-[11px] font-bold text-accent border border-accent/40 rounded-full px-2.5 py-1">샘플</button>
      </div>

      <div className="px-4 py-4 space-y-2.5">
        {Array.from({ length: step }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            {bot(Q[i], `b${i}`)}
            {me(summary(i), `m${i}`)}
          </div>
        ))}
        {step < Q.length && bot(Q[step], "cur")}
        {error && <div className="rounded-xl bg-[#FBECEC] border border-[#F1C9C7] p-3 text-[13px] text-danger">{error}</div>}
        {step < Q.length && (
          <div className="rounded-[20px] bg-white/85 border border-line p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm mt-1 reveal">{renderDock()}</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
