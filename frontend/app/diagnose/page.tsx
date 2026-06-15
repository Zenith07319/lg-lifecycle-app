"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2, Check } from "lucide-react";
import { diagnose, ocrEnergyLabel, getNewModels, SAMPLE_INPUT } from "@/lib/api";
import type { DiagnoseInput, SymptomLabel, NewModel } from "@/lib/types";

/* 02 진단 — Figma "02 진단" 재구축: 시작 → 한 화면당 질문 1개(Q1~Q10) →
   증상 선택 시 조건부 심각도 분기 → 우선순위 슬라이더 → 로딩 → 결과.
   친화적 버킷 선택을 백엔드 DiagnoseInput으로 매핑(데이터 계약 보존). */

// Q1 구매 시기 → 대표 연식(2026 기준 각 구간 중앙값)
const AGE_OPTS = [
  { key: "<3", label: "3년 미만", year: 2024 },
  { key: "3-5", label: "3~5년", year: 2022 },
  { key: "5-7", label: "5~7년", year: 2020 },
  { key: "7-10", label: "7~10년", year: 2017 },
  { key: "10+", label: "10년 초과", year: 2013 },
];
// Q4 주거형태 → 계약종별
const HOME_OPTS = [
  { key: "apt", label: "아파트 · 오피스텔", contract: "고압" as const },
  { key: "villa", label: "빌라 · 단독주택 · 다세대주택", contract: "저압" as const },
];
// Q5 증상(다중)
const SYMPTOM_OPTS: { key: string; label: string; sym: SymptomLabel | null; emoji: string }[] = [
  { key: "cool", label: "시원하지 않아요", sym: "성능저하", emoji: "❄️" },
  { key: "noise", label: "소리가 시끄러워요", sym: "소음", emoji: "🔊" },
  { key: "smell", label: "냄새가 나요", sym: "냄새", emoji: "👃" },
  { key: "leak", label: "물이 흘러나와요", sym: "누수", emoji: "💧" },
  { key: "unstable", label: "작동이 불안정해요", sym: "작동불량", emoji: "⚡" },
  { key: "none", label: "특별한 증상은 없어요", sym: null, emoji: "✅" },
];
// 증상별 심각도 3단계(약함/보통/심함) → 백엔드 1~5점.
// 주의: 백엔드 SEVERITY_MULTIPLIER에서 1=없음(0.1×)이므로, '증상을 선택한' 사용자의
// 최저 단계는 1(없음)이 아니라 2(낮음, 0.6×)로 매핑해야 함. → [2, 3, 5].
const SEVERITY_LEVELS = [2, 3, 5];
const SEVERITY_ORDER: SymptomLabel[] = ["성능저하", "소음", "냄새", "누수", "작동불량"];
const SEVERITY_QS: Record<SymptomLabel, { emoji: string; title: string; opts: string[] }> = {
  성능저하: { emoji: "❄️", title: "냉방 성능이 어느 정도로 불편한가요?", opts: ["조금 미흡해요", "자주 덥게 느껴져요", "거의 시원하지 않아요"] },
  소음: { emoji: "🔊", title: "소리가 어느 정도로 신경 쓰이나요?", opts: ["작게 들리는 정도예요", "거슬릴 때가 있어요", "생활에 방해돼요"] },
  냄새: { emoji: "👃", title: "냄새가 어느 정도로 느껴지나요?", opts: ["가끔 약하게 나요", "사용 중 자주 나요", "켤 때부터 심해요"] },
  누수: { emoji: "💧", title: "물이 얼마나 자주 떨어지나요?", opts: ["가끔 한두 방울", "사용 중 가끔 흘러요", "바닥에 고일 정도"] },
  작동불량: { emoji: "⚡", title: "작동 불편이 얼마나 자주 생기나요?", opts: ["가끔 멈칫한 정도예요", "꺼져도 다시 잘 돼요", "자주 멈추거나 재가동돼요"] },
  // 아래 두 라벨은 이 화면에서 쓰이지 않지만 타입 완전성을 위해 포함
  증상없음: { emoji: "✅", title: "", opts: [] },
  전기요금증가: { emoji: "💸", title: "", opts: [] },
};
// Q6 하루 사용시간
const HOURS_OPTS = [
  { label: "2시간 이하", v: 2 }, { label: "2~4시간", v: 3 }, { label: "4~8시간", v: 6 }, { label: "8시간 이상", v: 10 },
];
// Q7 연간 사용 개월
const MONTHS_OPTS = [
  { label: "1개월 이하", v: 1 }, { label: "2~3개월", v: 3 }, { label: "4~5개월", v: 5 }, { label: "6개월 이상", v: 6 },
];
// Q8 필터 청소 시기
const FILTER_OPTS = [
  { label: "1개월 이내", v: 1 }, { label: "1~3개월", v: 2 }, { label: "3~6개월", v: 5 }, { label: "한 번도 안 했어요", v: 24 },
];
// Q9 최근 2년 수리 이력
const REPAIR_OPTS = [
  { label: "아니요, 없어요", v: 0 }, { label: "점검만 받았어요", v: 0 }, { label: "수리 1회 이상 받았어요", v: 1 }, { label: "수리 2회 이상 받았어요", v: 2 },
];

type Answers = {
  ageKey: string | null;
  q2mode: "photo" | "manual";
  capacity: string; acKwh: string; summerKwh: string;
  homeKey: string | null;
  symptoms: SymptomLabel[]; none: boolean;
  severity: Partial<Record<SymptomLabel, number>>;   // 심각도 레벨 0~2
  hoursV: number | null; monthsV: number | null; filterV: number | null; repairIdx: number | null;
  cost: number; env: number; conv: number;
  newModelCode: string | null;   // Q11 신형 비교 기준
};
const INIT: Answers = {
  ageKey: null, q2mode: "manual", capacity: "", acKwh: "", summerKwh: "",
  homeKey: null, symptoms: [], none: false, severity: {},
  hoursV: null, monthsV: null, filterV: null, repairIdx: null,
  cost: 40, env: 30, conv: 30,
  newModelCode: null,
};

const TOTAL_Q = 11;
const PROG: Record<string, number> = { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 6, q7: 7, q8: 8, q9: 9, q10: 10, q11: 11 };

export default function DiagnosePage() {
  const router = useRouter();
  const [ans, setAns] = useState<Answers>(INIT);
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [newModels, setNewModels] = useState<NewModel[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const patch = (p: Partial<Answers>) => setAns((s) => ({ ...s, ...p }));

  // 동적 화면 목록: 증상 선택 시 해당 심각도 화면을 q5 뒤에 삽입
  const sevSyms = ans.none ? [] : SEVERITY_ORDER.filter((s) => ans.symptoms.includes(s));
  const SCREENS: { id: string; sym?: SymptomLabel }[] = [
    { id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }, { id: "q5" },
    ...sevSyms.map((s) => ({ id: "sev", sym: s })),
    { id: "q6" }, { id: "q7" }, { id: "q8" }, { id: "q9" }, { id: "q10" }, { id: "q11" },
  ];
  const safeCursor = Math.min(cursor, SCREENS.length - 1);
  const cur = SCREENS[safeCursor];
  const progNum = cur.id === "sev" ? 5 : PROG[cur.id];
  const isLast = cur.id === "q11";

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // 단계 전환 시 새 질문으로 포커스 이동(키보드·스크린리더 사용자 안내)
    if (started) screenRef.current?.focus({ preventScroll: true });
  }, [safeCursor, started]);

  // 신형 비교 라인업(LG 실제 라인업) 1회 로드
  useEffect(() => { getNewModels().then((r) => setNewModels(r.items)).catch(() => {}); }, []);

  // 내 형태(용량 기준) + 추천 라인업(내 형태 중 용량 근접, 없으면 전체 근접)
  const userForm: "벽걸이" | "스탠드" = (Number(ans.capacity) || 3.6) >= 5.5 ? "스탠드" : "벽걸이";
  const recommendedModel = (() => {
    if (newModels.length === 0) return undefined;
    const cap = Number(ans.capacity) || 3.6;
    const same = newModels.filter((m) => m.form === userForm);
    const pool = same.length ? same : newModels;
    return [...pool].sort((a, b) => Math.abs(a.capacity_kw - cap) - Math.abs(b.capacity_kw - cap))[0];
  })();
  // Q11 진입 시 추천 라인업 자동 선택(미선택일 때만)
  useEffect(() => {
    if (cur.id === "q11" && newModels.length && !ans.newModelCode && recommendedModel) {
      patch({ newModelCode: recommendedModel.model_code });
    }
  }, [cur.id, newModels]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OCR(에너지 라벨 자동입력) ──
  const onOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setOcrLoading(true); setOcrMsg("");
    try {
      const r = await ocrEnergyLabel(f);
      const parts: string[] = [];
      const p: Partial<Answers> = {};
      if (r.monthly_kwh) { p.acKwh = String(r.monthly_kwh); parts.push(`월간소비전력량 ${r.monthly_kwh}kWh`); }
      if (r.capacity_kw) { p.capacity = String(r.capacity_kw); parts.push(`냉방용량 ${r.capacity_kw}kW`); }
      if (parts.length) patch(p);
      setOcrMsg(parts.length
        ? `📷 인식됨: ${parts.join(" · ")}${r.source === "mock" ? " (샘플)" : ""} — 값을 확인하고 진행하세요`
        : "사진에서 값을 못 읽었어요. 또렷하게 다시 찍거나 직접 입력해 주세요.");
    } catch {
      setOcrMsg("인식에 실패했어요. 직접 입력해 주세요.");
    } finally { setOcrLoading(false); }
  };

  // ── 답변 → 백엔드 입력 ──
  const buildInput = (): DiagnoseInput => {
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const age = AGE_OPTS.find((o) => o.key === ans.ageKey);
    const home = HOME_OPTS.find((o) => o.key === ans.homeKey);
    // 자유 입력값은 백엔드 Pydantic 범위로 클램프(범위 밖 입력 시 422 방지)
    const summer = clamp(Number(ans.summerKwh) || 0, 0, 1000);
    const symptoms = ans.none ? [] : ans.symptoms.map((s) => ({ type: s, severity: SEVERITY_LEVELS[ans.severity[s] ?? 1] }));
    // 우선순위 3축이 모두 0이면 백엔드 정규화가 0/0 분모가 되므로 균등값으로 방어
    const pTot = ans.cost + ans.env + ans.conv;
    const pri = pTot > 0 ? { c: ans.cost, e: ans.env, v: ans.conv } : { c: 34, e: 33, v: 33 };
    return {
      product_type: "에어컨",
      purchase_year: age?.year ?? 2018,
      capacity_kw: clamp(Number(ans.capacity) || 3.6, 0.1, 20),
      daily_usage_hours: ans.hoursV ?? 6,
      usage_months: ans.monthsV ?? 4,
      contract_type: home?.contract ?? "고압",
      summer_monthly_kwh: summer,
      base_monthly_kwh: summer ? clamp(Math.round(summer * 0.6), 150, 1000) : 350,
      ac_monthly_kwh_input: clamp(Number(ans.acKwh) || 0, 0, 500),
      season: "하계",
      symptoms,
      filter_clean_months: ans.filterV ?? 6,
      repair_history_count: REPAIR_OPTS[ans.repairIdx ?? 0].v,
      priority_cost_score: pri.c,
      priority_env_score: pri.e,
      priority_convenience_score: pri.v,
      new_model_code: ans.newModelCode ?? undefined,
    };
  };

  const runDiagnose = async (payload: DiagnoseInput) => {
    setLoading(true); setError("");
    try { const res = await diagnose(payload); router.push(`/result/${res.session_id}`); }
    catch (e) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); setLoading(false); }
  };

  // ── 네비게이션 ──
  const canNext = (): boolean => {
    switch (cur.id) {
      case "q1": return !!ans.ageKey;
      case "q2": return Number(ans.capacity) > 0;
      case "q3": return true;                         // 사용량 미입력 허용(0 → 백엔드 추정)
      case "q4": return !!ans.homeKey;
      case "q5": return ans.none || ans.symptoms.length > 0;
      case "sev": return cur.sym ? ans.severity[cur.sym] !== undefined : true;
      case "q6": return ans.hoursV !== null;
      case "q7": return ans.monthsV !== null;
      case "q8": return ans.filterV !== null;
      case "q9": return ans.repairIdx !== null;
      case "q10": return true;
      case "q11": return true;   // 신형 선택은 권장(기본 추천 자동 선택), 건너뛰어도 진행
      default: return true;
    }
  };
  const goNext = () => {
    if (!canNext()) return;
    if (isLast) { runDiagnose(buildInput()); return; }
    setCursor((c) => Math.min(c + 1, SCREENS.length - 1));
  };
  const goBack = () => {
    if (safeCursor <= 0) { setStarted(false); return; }
    setCursor((c) => Math.max(0, c - 1));
  };
  const sampleFast = () => runDiagnose(SAMPLE_INPUT);

  // Q10 우선순위: 세 축 합을 항상 100으로 유지(드래그 시 나머지 두 축을 비율대로 재분배)
  const setPriority = (axis: "cost" | "env" | "conv", val: number) => {
    setAns((s) => {
      const v = Math.round(Math.min(100, Math.max(0, val)));
      const others = (["cost", "env", "conv"] as const).filter((a) => a !== axis);
      const rest = 100 - v;
      const o0 = s[others[0]], o1 = s[others[1]];
      const osum = o0 + o1;
      const n0 = osum <= 0 ? Math.round(rest / 2) : Math.round((rest * o0) / osum);
      const n1 = rest - n0;
      return { ...s, [axis]: v, [others[0]]: n0, [others[1]]: n1 };
    });
  };

  // Q5 증상 토글
  const toggleSymptom = (o: typeof SYMPTOM_OPTS[number]) => {
    if (o.sym === null) { patch({ none: true, symptoms: [], severity: {} }); return; }
    setAns((s) => {
      const has = s.symptoms.includes(o.sym!);
      const symptoms = has ? s.symptoms.filter((x) => x !== o.sym) : [...s.symptoms, o.sym!];
      const severity = { ...s.severity }; if (has) delete severity[o.sym!];
      return { ...s, none: false, symptoms, severity };
    });
  };

  /* ── 로딩 화면(02-6) ── */
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-[100dvh] flex-col items-center justify-center px-10 text-center">
        <img src="/character.png" alt="" aria-hidden className="size-[176px] object-contain animate-bounce drop-shadow-[0_12px_22px_rgba(4,125,134,.18)]" />
        <p className="mt-7 text-[13px] font-medium text-muted">잠시만요,</p>
        <p className="mt-1 text-[19px] font-extrabold text-ink">결과를 분석하고 있어요</p>
        <p className="mt-2 text-[12px] text-muted">입력하신 정보로 5가지 시나리오를 비교 중이에요</p>
        <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-accent-soft">
          <span className="block h-full w-1/2 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
        <style>{`@keyframes loadbar{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
      </div>
    );
  }

  /* ── 시작 화면(02-1) ── */
  if (!started) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center px-8 text-center"
        style={{ background: "linear-gradient(180deg,#F5F8F7 0%,#E7F3EF 60%,#DBEEE8 100%)" }}>
        <div className="mt-[14vh] reveal">
          <p className="text-[20px] font-extrabold leading-snug text-ink">반가워요! 지금부터<br />우리 집 에어컨 상태를<br />진단해볼까요?</p>
          <p className="mt-3 text-[13px] font-medium leading-relaxed text-muted">어렵지 않아요! 제가 하나씩 물어볼 테니<br />편히 답해주세요.</p>
        </div>
        <img src="/character.png" alt="" className="reveal reveal-2 my-auto size-[200px] object-contain drop-shadow-[0_14px_26px_rgba(4,125,134,.18)]" />
        <button onClick={() => { setStarted(true); setCursor(0); }}
          className="reveal reveal-3 mb-10 w-full rounded-full bg-accent py-4 text-[16px] font-extrabold text-white shadow-[0_8px_22px_rgba(4,125,134,.30)] active:scale-[.99] transition">
          Start
        </button>
        <button onClick={sampleFast} className="mb-6 -mt-6 text-[11px] font-bold text-accent/70">샘플로 빠르게 보기</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: "linear-gradient(180deg,#F5F8F7 0%,#E9F3EF 55%,#DBEEE8 100%)" }}>
      <div ref={topRef} />
      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center gap-2.5 bg-white/55 px-4 py-3 backdrop-blur-md">
        <button onClick={goBack} aria-label="이전 단계로"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/90 text-ink-soft shadow-[0_2px_8px_rgba(5,31,31,.06)] active:scale-95 transition">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-ink">가전 진단</h1>
        <span className="ml-auto text-[13px] font-semibold text-muted">{progNum}/{TOTAL_Q}</span>
        <button onClick={sampleFast} className="rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-bold text-accent">샘플</button>
      </header>

      {/* 진행 바 */}
      <div className="h-1 w-full bg-line/60">
        <div className="h-full rounded-r-full bg-accent transition-all duration-300" style={{ width: `${(progNum / TOTAL_Q) * 100}%` }} />
      </div>

      <div key={`${cur.id}:${cur.sym ?? ""}`} ref={screenRef} tabIndex={-1} role="group" aria-label={`질문 ${progNum} / ${TOTAL_Q}`}
        className="reveal flex flex-1 flex-col px-6 pb-5 pt-7 outline-none">
        {/* ── 질문별 본문 ── */}
        {cur.id === "q1" && (
          <Question n={1} emoji="🗓️" title={"에어컨을 구매한 지\n얼마나 됐나요?"}>
            <Options>
              {AGE_OPTS.map((o) => (
                <Opt key={o.key} sel={ans.ageKey === o.key} onClick={() => patch({ ageKey: o.key })}>{o.label}</Opt>
              ))}
            </Options>
          </Question>
        )}

        {cur.id === "q2" && (
          <Question n={2} image="/diagnose/guide-label.png" imageAlt="에너지효율 라벨에서 냉방능력과 월간소비전력량을 찾는 위치 안내"
            title={"에어컨 냉방능력과\n월 사용 전기량이 필요해요!"}
            sub="진단 전, 아래 에너지효율 라벨을 찾아주세요. 입력이 어려우면 직접 입력도 가능해요.">
            <div className="grid grid-cols-2 gap-2">
              {(["photo", "manual"] as const).map((m) => (
                <button key={m} onClick={() => patch({ q2mode: m })}
                  className={`rounded-2xl py-2.5 text-[13px] font-bold transition ${ans.q2mode === m ? "border-2 border-accent bg-accent-soft text-accent" : "border border-line bg-white/70 text-ink-soft"}`}>
                  {m === "photo" ? "📷 사진으로 자동 입력" : "✏️ 직접 입력"}
                </button>
              ))}
            </div>
            {ans.q2mode === "photo" && (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent bg-accent-soft py-3 text-[13px] font-extrabold text-accent disabled:opacity-50">
                  {ocrLoading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  {ocrLoading ? "라벨 인식 중…" : "에너지효율 라벨 촬영하기"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onOcrFile} />
                {ocrMsg && <p className="mt-2 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2 text-[11.5px] text-ink-soft">{ocrMsg}</p>}
              </>
            )}
            {(ans.q2mode === "manual" || ans.capacity !== "" || ans.acKwh !== "") && (
              <>
                <Field label="냉방능력 (kW)" hint="라벨에 kW로 표시된 값" value={ans.capacity} onChange={(v) => patch({ capacity: v })} placeholder="예: 3.6" step="0.1" min="0.1" max="20" />
                <Field label="월간소비전력량 (kWh/월)" hint="라벨의 '월간소비전력량' 항목 (선택)" value={ans.acKwh} onChange={(v) => patch({ acKwh: v })} placeholder="예: 110" min="0" max="500" />
              </>
            )}
          </Question>
        )}

        {cur.id === "q3" && (
          <Question n={3} image="/diagnose/guide-bill.png" imageAlt="전기 고지서에서 사용량(kWh)을 찾는 위치 안내"
            title={"여름에 전기를\n얼마나 쓰는지 알려주세요"}
            sub="전기요금이 아니라, 고지서에 적힌 kWh 옆 숫자를 보면 돼요.">
            <Field label="여름 한 달 사용량 (kWh)" hint="한전 고지서·한전ON앱에서 확인 (선택)" value={ans.summerKwh} onChange={(v) => patch({ summerKwh: v })} placeholder="예: 460" step="10" min="0" max="1000" />
          </Question>
        )}

        {cur.id === "q4" && (
          <Question n={4} emoji="📍" title="주거형태를 알려주세요!">
            <Options>
              {HOME_OPTS.map((o) => (
                <Opt key={o.key} sel={ans.homeKey === o.key} onClick={() => patch({ homeKey: o.key })}>{o.label}</Opt>
              ))}
            </Options>
            <Tip>정확한 계산을 원하면 청구서의 ‘계약종별’을 확인하세요. 한전ON앱 → 전기요금 조회, 또는 종이 고지서 상단에서 볼 수 있어요.</Tip>
          </Question>
        )}

        {cur.id === "q5" && (
          <Question n={5} emoji="📋" title="에어컨에 어떤 증상이 있나요?" sub="해당하는 증상을 모두 선택해주세요.">
            <Options>
              {SYMPTOM_OPTS.map((o) => {
                const sel = o.sym === null ? ans.none : ans.symptoms.includes(o.sym);
                return <Opt key={o.key} sel={sel} onClick={() => toggleSymptom(o)}><span aria-hidden className="mr-1">{o.emoji}</span>{o.label}</Opt>;
              })}
            </Options>
          </Question>
        )}

        {cur.id === "sev" && cur.sym && (
          <Question n={5} emoji={SEVERITY_QS[cur.sym].emoji} title={SEVERITY_QS[cur.sym].title} sub={`‘${cur.sym}’ 증상은 어느 정도인가요?`}>
            <Options>
              {SEVERITY_QS[cur.sym].opts.map((label, i) => {
                const sym = cur.sym!;
                return <Opt key={i} sel={ans.severity[sym] === i} onClick={() => setAns((s) => ({ ...s, severity: { ...s.severity, [sym]: i } }))}>{label}</Opt>;
              })}
            </Options>
          </Question>
        )}

        {cur.id === "q6" && (
          <Question n={6} emoji="⏰" title={"하루에 에어컨을\n얼마나 틀어두나요?"}>
            <Options>{HOURS_OPTS.map((o) => <Opt key={o.v} sel={ans.hoursV === o.v} onClick={() => patch({ hoursV: o.v })}>{o.label}</Opt>)}</Options>
          </Question>
        )}

        {cur.id === "q7" && (
          <Question n={7} emoji="📅" title={"1년에 몇 달 정도\n에어컨을 사용하나요?"} sub="여름철 기준으로, 평소 패턴에 가장 가까운 걸 골라주세요.">
            <Options>{MONTHS_OPTS.map((o) => <Opt key={o.v} sel={ans.monthsV === o.v} onClick={() => patch({ monthsV: o.v })}>{o.label}</Opt>)}</Options>
          </Question>
        )}

        {cur.id === "q8" && (
          <Question n={8} emoji="🧹" title={"필터 청소는\n마지막으로 언제 했나요?"} sub="기억나는 기준으로 선택해주세요!">
            <Options>{FILTER_OPTS.map((o) => <Opt key={o.label} sel={ans.filterV === o.v} onClick={() => patch({ filterV: o.v })}>{o.label}</Opt>)}</Options>
          </Question>
        )}

        {cur.id === "q9" && (
          <Question n={9} emoji="🛡️" title={"최근 2년 안에 에어컨\n수리를 받은 적이 있나요?"} sub="기사님 점검이나 수리를 받은 적이 있는지 알려주세요.">
            <Options>{REPAIR_OPTS.map((o, i) => <Opt key={i} sel={ans.repairIdx === i} onClick={() => patch({ repairIdx: i })}>{o.label}</Opt>)}</Options>
          </Question>
        )}

        {cur.id === "q10" && (
          <Question n={10} emoji="⭐" title="무엇을 가장 중요하게 볼까요?" sub="거의 다 왔어요! 내 상황에 맞게 조절해봐요.">
            <div className="space-y-3">
              <Slider label="비용 절약" desc="전기요금·수리비·교체비 최소화가 중요해요." color="#EA6D2E" value={ans.cost} onChange={(v) => setPriority("cost", v)} />
              <Slider label="환경 영향" desc="탄소 배출 절감·에너지 효율이 중요해요." color="#2FA060" value={ans.env} onChange={(v) => setPriority("env", v)} />
              <Slider label="사용 편의" desc="고장 걱정·관리 번거로움을 줄이고 싶어요." color="#2F7DD1" value={ans.conv} onChange={(v) => setPriority("conv", v)} />
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">세 항목 합이 100%가 되도록 자동 조절돼요.</p>
          </Question>
        )}

        {cur.id === "q11" && (
          <ProductStep
            capacity={Number(ans.capacity) || 3.6}
            userKwh={Number(ans.acKwh) || 0}
            userForm={userForm}
            models={newModels}
            recommended={recommendedModel?.model_code}
            selected={ans.newModelCode}
            onSelect={(code) => patch({ newModelCode: code })}
            expanded={expandedModel}
            onExpand={(code) => setExpandedModel((p) => (p === code ? null : code))}
          />
        )}

        {/* 에러 */}
        {error && <div className="mt-3 rounded-xl border border-[#F1C9C7] bg-[#FBECEC] p-3 text-[13px] text-danger">{error}</div>}

        {/* 다음 / 결과 보기 */}
        <div className="mt-auto pt-6">
          <button onClick={goNext} disabled={!canNext()}
            className={`w-full rounded-full py-4 text-[15px] font-extrabold transition active:scale-[.99] ${
              !canNext()
                ? "border border-line bg-white/40 text-ink-300"
                : isLast
                  ? "bg-accent text-white shadow-[0_8px_22px_rgba(4,125,134,.30)]"
                  : "border-[1.5px] border-accent bg-white/50 text-accent"
            }`}>
            {isLast ? "결과 보기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 소형 프레젠테이션 컴포넌트 ── */
function Question({ n, emoji, image, imageAlt, title, sub, children }: { n: number; emoji?: string; image?: string; imageAlt?: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-[13px] font-extrabold text-accent">Q{n}.</p>
      <h2 className="mt-1 whitespace-pre-line text-center text-[20px] font-extrabold leading-snug text-ink">{title}</h2>
      {sub && <p className="mt-2 text-center text-[12.5px] font-medium leading-relaxed text-muted">{sub}</p>}
      {image ? (
        <img src={image} alt={imageAlt ?? ""} className="my-5 w-full rounded-2xl border border-line bg-white/70 shadow-[0_2px_10px_rgba(5,31,31,.06)]" />
      ) : (
        <div aria-hidden className="my-6 text-center text-[58px] leading-none">{emoji}</div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Options({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5">{children}</div>;
}
function Opt({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`relative flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-4 text-[15px] font-bold transition-all active:scale-[.99] ${
        sel
          ? "border-2 border-accent bg-accent-soft text-accent shadow-[0_4px_14px_rgba(4,125,134,.16)]"
          : "border border-line bg-white/80 text-ink-soft shadow-[0_2px_8px_rgba(5,31,31,.05)]"
      }`}>
      {children}
      {sel && <Check size={17} className="absolute right-4 text-accent" />}
    </button>
  );
}
function Field({ label, hint, value, onChange, placeholder, step, min, max }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string; min?: string; max?: string }) {
  return (
    <div className="mt-3">
      <label className="text-[12px] font-bold text-ink-soft">{label}</label>
      <input type="number" inputMode="decimal" step={step} min={min} max={max} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-300 focus:border-accent focus:bg-white" />
      {hint && <p className="mt-1 text-[10.5px] text-muted">{hint}</p>}
    </div>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-2 rounded-2xl border border-[#CDE9C2] bg-green-050 px-3.5 py-3 text-[11.5px] leading-relaxed text-[#2f7d46]">
      <span aria-hidden className="mt-0.5 shrink-0">🌱</span><div>{children}</div>
    </div>
  );
}
function Slider({ label, desc, color, value, onChange }: { label: string; desc: string; color: string; value: number; onChange: (v: number) => void }) {
  // value 자체가 %(세 축 합=100). 썸 위치 = 표시 % = 전송값으로 일치.
  return (
    <div className="rounded-2xl border border-line bg-white/80 px-4 py-3.5 shadow-[0_2px_8px_rgba(5,31,31,.05)]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-extrabold text-ink">{label}</span>
        <span className="text-[15px] font-extrabold" style={{ color }}>{value}%</span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted">{desc}</p>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} ${value}퍼센트`} className="mt-2.5 w-full" style={{ accentColor: color }} />
    </div>
  );
}

/* ── Q11 신형 비교 제품 선택 ── */
function gradeCls(g: string) {
  if (g.startsWith("1")) return "bg-[#e7f4ec] text-[#1a6b3d]";
  if (g.startsWith("2")) return "bg-[#eaf6ef] text-[#2f8f55]";
  if (g.startsWith("3")) return "bg-[#fff3da] text-[#a9730a]";
  return "bg-[#f1f1f3] text-[#6b7178]";
}
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

const GROUP_LABEL: Record<string, string> = { "스탠드": "스탠드 (2in1)", "벽걸이": "벽걸이", "창호형": "창호형", "이동식": "이동식" };

function ProductStep({ capacity, userKwh, userForm, models, recommended, selected, onSelect, expanded, onExpand }: {
  capacity: number; userKwh: number; userForm: "벽걸이" | "스탠드"; models: NewModel[];
  recommended?: string; selected: string | null; onSelect: (code: string) => void;
  expanded: string | null; onExpand: (code: string) => void;
}) {
  const sel = models.find((m) => m.model_code === selected);
  // 그룹 순서: 내 형태 먼저, 이후 스탠드·벽걸이·창호형·이동식
  const order = [userForm, ...["스탠드", "벽걸이", "창호형", "이동식"].filter((f) => f !== userForm)];
  const groups = order
    .map((f) => ({ form: f, items: models.filter((m) => m.form === f).sort((a, b) => b.capacity_kw - a.capacity_kw) }))
    .filter((g) => g.items.length > 0);
  return (
    <Question n={11} emoji="🆕" title={"바꾼다면 어떤 신형과\n비교해볼까요?"}
      sub="LG 라인업 중 하나를 고르면, 그 제품의 실제 스펙·가격으로 절감액과 5가지 선택지를 다시 계산해요.">
      <div className="space-y-4">
        {models.length === 0 && <p className="py-6 text-center text-[12px] text-muted">라인업을 불러오는 중…</p>}
        {groups.map((g) => (
          <div key={g.form} className="space-y-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[12px] font-extrabold text-ink-soft">{GROUP_LABEL[g.form] ?? g.form}</span>
              <span className="text-[11px] font-bold text-ink-300">{g.items.length}</span>
              {g.form === userForm && <span className="rounded-full bg-green-050 px-1.5 py-0.5 text-[9.5px] font-extrabold text-success">내 에어컨 형태</span>}
            </div>
            {g.items.map((m) => (
              <ProductCard key={m.model_code} m={m} capacity={capacity}
                on={m.model_code === selected} rec={m.model_code === recommended} open={expanded === m.model_code}
                onSelect={onSelect} onExpand={onExpand} />
            ))}
          </div>
        ))}
      </div>
      {sel && <CompareBox sel={sel} userKwh={userKwh} />}
    </Question>
  );
}

function ProductCard({ m, capacity, on, rec, open, onSelect, onExpand }: {
  m: NewModel; capacity: number; on: boolean; rec: boolean; open: boolean;
  onSelect: (code: string) => void; onExpand: (code: string) => void;
}) {
  const big = m.capacity_kw > capacity * 1.5;
  const tall = m.form === "스탠드";
  return (
    <div onClick={() => onSelect(m.model_code)}
      className={`relative rounded-[18px] p-3 shadow-[var(--shadow-card)] transition active:scale-[.99] ${on ? "border-2 border-accent bg-white" : "border border-line bg-white/80"}`}>
      {on && <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-accent text-white"><Check size={13} /></div>}
      <div className="flex gap-3">
        <div className="flex h-[88px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-[#e7e8e2] bg-gradient-to-b from-[#f3f2ee] to-[#e7e8e2]">
          {tall
            ? <div className="relative h-[70px] w-6 rounded-lg border border-[#dcdfd8] bg-gradient-to-b from-[#fbfbf8] to-[#e8e9e3]"><span className="absolute left-1/2 top-2 size-2 -translate-x-1/2 rounded-full bg-[#7a847f]" /></div>
            : <div className="h-6 w-14 rounded-lg border border-[#dcdfd8] bg-gradient-to-b from-white to-[#eceee9]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {m.grade
              ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${gradeCls(m.grade)}`}>효율 {m.grade}</span>
              : <span className="rounded-full bg-[#f1f1f3] px-1.5 py-0.5 text-[10px] font-extrabold text-[#6b7178]">등급 미표기</span>}
            {m.grade.startsWith("1") && <span className="rounded-full border border-[#bfe6e4] bg-accent-soft px-1.5 py-0.5 text-[10px] font-extrabold text-accent">1등급</span>}
            {rec && <span className="rounded-full bg-green-050 px-1.5 py-0.5 text-[10px] font-extrabold text-success">내 방에 맞음</span>}
          </div>
          <p className="mt-1 text-[13.5px] font-extrabold leading-tight text-ink">{m.line}</p>
          <p className="text-[10px] font-semibold text-ink-300">{m.product_type_raw} · {m.model_code}</p>
          <p className="mt-1 text-[11.5px] font-semibold text-ink-soft">냉방 {m.pyeong}평{m.cooling_area_m2 ? `(${m.cooling_area_m2}㎡)` : ""} · {m.capacity_kw}kW · 월 {m.monthly_kwh}kWh</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="text-[11px] text-ink-300 line-through">{won(m.list_price)}</span>
            <span className="text-[14.5px] font-black text-ink">{won(m.sale_price)}</span>
            {m.sub_fee > 0 && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent">구독 월 {m.sub_fee.toLocaleString("ko-KR")}원</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.features.slice(0, 3).map((f) => <span key={f.name} className="rounded-full border border-line bg-sunken px-2 py-0.5 text-[10px] font-bold text-ink-soft">{f.name}</span>)}
          </div>
        </div>
      </div>
      {big && <p className="mt-2 rounded-lg bg-[#FFF6E6] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#9a6a00]">⚠️ 내 방({capacity}kW)보다 큰 용량이에요. 신형이 전기를 더 쓸 수 있어요.</p>}
      <button onClick={(e) => { e.stopPropagation(); onExpand(m.model_code); }}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-1.5 text-[11.5px] font-extrabold text-accent">
        {open ? "접기 ▲" : "기능·스펙 자세히 ▾"}
      </button>
      {open && (
        <div className="mt-2.5 border-t border-line pt-2.5">
          <p className="text-[12.5px] font-extrabold text-ink">“{m.tagline}”</p>
          {m.product_name && <p className="mt-1 text-[10px] leading-snug text-ink-300">{m.product_name}</p>}
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {m.features.map((f) => (
              <div key={f.name}>
                <p className="text-[11px] font-extrabold text-ink"><span className="text-accent">· </span>{f.name}</p>
                <p className="pl-2 text-[10px] leading-snug text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareBox({ sel, userKwh }: { sel: NewModel; userKwh: number }) {
  return (
    <div className="rounded-[18px] border border-[#bfe6e4] bg-accent-soft p-3.5">
      <p className="text-[12.5px] font-extrabold text-teal-900">📊 비교 기준: {sel.line}</p>
      <p className="mt-1.5 text-[11.5px] font-semibold text-ink-soft">
        월 {sel.monthly_kwh}kWh · 효율 {sel.grade || "미표기"} · 판매가 {won(sel.sale_price)}{sel.sub_fee > 0 ? ` · 구독 월 ${sel.sub_fee.toLocaleString("ko-KR")}원` : ""}
      </p>
      {userKwh > 0 && (
        <p className="mt-1.5 text-[11.5px] font-bold text-accent">
          내 에어컨 {userKwh}kWh → 신형 {sel.monthly_kwh}kWh{userKwh > sel.monthly_kwh ? ` (약 ${Math.round((userKwh - sel.monthly_kwh) / userKwh * 100)}%↓)` : ""}
        </p>
      )}
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-500">이 신형 기준으로 전기료 절감·탄소·5가지 순위를 계산해요.</p>
    </div>
  );
}
