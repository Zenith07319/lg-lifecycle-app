"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, ChevronDown, ChevronRight, Trophy, Loader2, ShoppingBag, Repeat, MapPin } from "lucide-react";
import { getSession } from "@/lib/api";
import { saveDevice } from "@/lib/myDevice";
import type { SessionData, OptionScore } from "@/lib/types";
import { GRADE_COLORS, OPTION_ICONS, fmt, fmtCo2 } from "@/lib/utils";

/* ── 건강등급 링 히어로 ── */
function GradeHero({ data }: { data: SessionData }) {
  const d = data.diagnosis;
  const grade = d.health_grade as string;
  const score = d.health_score as number;
  const color = GRADE_COLORS[grade] ?? "#a50034";
  const R = 54, CIRC = 2 * Math.PI * R;
  const [prog, setProg] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  useEffect(() => { const t = setTimeout(() => setProg(Math.min(score, 100)), 120); return () => clearTimeout(t); }, [score]);
  const off = CIRC * (1 - prog / 100);

  // 표시 지표: 생활 불편 제외 (직관성). 둘 다 낮을수록 건강.
  const metrics: [string, string][] = [
    ["점검 필요도", `${(d.inspection_score_100 as number).toFixed(0)}`],
    ["에너지 낭비", `${((d.energy_waste_ratio as number) * 100).toFixed(0)}%`],
  ];
  // 점수 계산 내역 (종합위험 = 점검0.45 + 에너지낭비0.30 + 생활불편0.25 → 감점)
  const insp = (d.inspection_score_100 as number) / 100;
  const ene = d.energy_waste_ratio as number;
  const inc = d.inconvenience as number;
  const calc: [string, string, number][] = [
    ["점검 필요도", `${(d.inspection_score_100 as number).toFixed(0)}`, insp * 0.45 * 100],
    ["에너지 낭비", `${(ene * 100).toFixed(0)}%`, ene * 0.30 * 100],
    ["생활 불편", `${(inc * 100).toFixed(0)}`, inc * 0.25 * 100],
  ];
  return (
    <div className="rounded-[26px] p-6 text-center border border-line shadow-[var(--shadow-pop)]"
      style={{ background: `linear-gradient(180deg,#ffffff 0%, ${color}10 100%)` }}>
      <div className="relative w-[150px] h-[150px] mx-auto">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="#ece2db" strokeWidth="11" />
          <circle cx="64" cy="64" r={R} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[58px] leading-none font-extrabold"
            style={{ fontFamily: "var(--font-display)", color }}>{grade}</span>
        </div>
      </div>
      <p className="mt-2 text-[14px] font-bold text-ink">
        건강점수 <span style={{ fontFamily: "var(--font-display)" }}>{score.toFixed(0)}</span>점
      </p>
      <p className="text-[12.5px] text-muted">{d.grade_description as string}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {metrics.map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-[#faf5f2] py-2.5">
            <div className="text-[18px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>{v}</div>
            <div className="text-[10.5px] text-muted mt-0.5">{l} <span className="text-grade-a">↓좋음</span></div>
          </div>
        ))}
      </div>

      {/* 점수 계산 내역 더보기 */}
      <button onClick={() => setShowCalc(!showCalc)}
        className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-crimson">
        점수 계산 내역 {showCalc ? "접기" : "더보기"}
        <ChevronDown size={13} className={`transition-transform ${showCalc ? "rotate-180" : ""}`} />
      </button>
      {showCalc && (
        <div className="mt-2 text-left rounded-2xl bg-[#faf5f2] p-3.5 space-y-1.5">
          <p className="text-[11px] text-muted leading-relaxed">건강점수 = <b>100 − 종합위험</b>. 종합위험은 아래 3가지를 가중합해요 (감점 클수록 등급 ↓).</p>
          {calc.map(([l, v, contrib]) => (
            <div key={l} className="flex items-center gap-2 text-[11.5px]">
              <span className="w-[66px] text-ink-soft font-semibold">{l}</span>
              <span className="text-muted">{v}</span>
              <span className="ml-auto font-extrabold text-grade-d" style={{ fontFamily: "var(--font-display)" }}>−{contrib.toFixed(0)}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted pt-1.5 border-t border-line/60">반영 비율 · 점검 45% / 에너지 30% / 생활불편 25%</p>
        </div>
      )}
    </div>
  );
}

/* ── 전기요금 카드 ── */
function ElecCard({ data }: { data: SessionData }) {
  const oldC = data.delta_old.ac_delta_cost as number;
  const newC = data.delta_new.ac_delta_cost as number;
  const months = (data.user_inputs.usage_months as number) || 4;
  const save5 = Math.max(0, (oldC - newC) * months * 5);
  const changed = data.delta_old.tier_changed as boolean;
  const byInput = ((data.user_inputs.ac_monthly_kwh_input as number) || 0) > 0;
  return (
    <div className="rounded-[22px] bg-surface border border-line p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[14px] font-extrabold text-ink">⚡ 전기요금 (에어컨 기여 · 월)</h3>
        <span className={`ml-auto text-[10px] font-extrabold rounded-full px-2 py-0.5 ${byInput ? "text-crimson bg-[#fdeef4]" : "text-muted bg-[#f1efed]"}`}>
          {byInput ? "📋 입력값 기준" : "📊 추정 기준"}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1 rounded-2xl bg-[#fff6f0] p-3 text-center">
          <p className="text-[11px] text-muted">지금 구형</p>
          <p className="text-[19px] font-extrabold text-grade-d" style={{ fontFamily: "var(--font-display)" }}>{fmt(oldC)}</p>
        </div>
        <div className="pb-3 text-muted text-[13px] font-bold">→</div>
        <div className="flex-1 rounded-2xl bg-[#eef8f0] p-3 text-center">
          <p className="text-[11px] text-muted">1등급 신형</p>
          <p className="text-[19px] font-extrabold text-grade-a" style={{ fontFamily: "var(--font-display)" }}>{fmt(newC)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#faf5f2] px-4 py-2.5">
        <span className="text-[12.5px] text-ink-soft font-semibold">여름철 5년 절감 (교체 시)</span>
        <span className="text-[15px] font-extrabold text-crimson" style={{ fontFamily: "var(--font-display)" }}>{fmt(save5)}</span>
      </div>
      {changed && (
        <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          ⚡ 누진 구간 이동: {data.delta_old.tier_with_ac as string} → {data.delta_new.tier_with_ac as string} (절감폭 ↑)
        </p>
      )}
    </div>
  );
}

/* ── 5지표 점수(0~1) → 5단계 등급 ── */
function rate5(s: number): [string, string] {
  const v = s * 100;
  if (v >= 80) return ["매우좋음", "#1f9d55"];
  if (v >= 60) return ["좋음", "#5fb878"];
  if (v >= 40) return ["보통", "#9a8f86"];
  if (v >= 20) return ["나쁨", "#e0883c"];
  return ["매우나쁨", "#d2453f"];
}

/* ── 선택지 카드 (순위=index 기준, 점수 숫자·등급화·펼침) ── */
function OptionCard({ opt, rank, max }: { opt: OptionScore; rank: number; max: number }) {
  const [open, setOpen] = useState(rank === 1);
  const first = rank === 1;
  const score100 = Math.round(opt.final_score * 100);   // final_score 0~1 → 점수
  return (
    <div className={`rounded-[20px] overflow-hidden border shadow-[var(--shadow-card)] ${first ? "border-crimson bg-[#fff7fa]" : "border-line bg-surface"}`}>
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-[18px]">{OPTION_ICONS[opt.key] ?? "•"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold text-ink">{opt.label}</span>
              {first
                ? <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-crimson rounded-full px-2 py-0.5"><Trophy size={11} /> 1순위</span>
                : <span className="text-[11px] font-bold text-muted">{rank}순위</span>}
              <span className="ml-auto text-[17px] font-extrabold leading-none" style={{ fontFamily: "var(--font-display)", color: first ? "#a50034" : "#7a6c64" }}>
                {score100}<span className="text-[11px] font-bold">점</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[#efe7e1] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(6, (opt.final_score / max) * 100)}%`, background: first ? "linear-gradient(90deg,#a50034,#c2185b)" : "#c9bdb4" }} />
            </div>
          </div>
          <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-line/70 space-y-3">
          {/* 비용·점검·탄소 — 낮을수록 좋음 */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-[14px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>{fmt(opt.three_year_cost)} <span className="text-[10px] font-medium text-muted">5년 총비용</span></span>
            <span className="text-[10px] text-muted">아래 3개 <b>낮을수록 좋아요 ↓</b></span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["초기비용", fmt(opt.initial_cost)], ["점검 필요도", `${(opt.inspection_after * 100).toFixed(0)}`], ["탄소", fmtCo2(opt.carbon_total)]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-[#faf5f2] py-2">
                <div className="text-[13px] font-extrabold text-ink">{v}</div>
                <div className="text-[10px] text-muted">{l}</div>
              </div>
            ))}
          </div>
          {/* 5지표 — 등급(높을수록 좋음) */}
          <div>
            <p className="text-[10px] text-muted mb-1 px-0.5">5개 지표 (<b>높을수록 좋아요 ↑</b>)</p>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {([["경제", opt.economy_score], ["신뢰", opt.reliability_score], ["탄소", opt.carbon_score], ["편의", opt.comfort_score], ["초기", opt.initial_score]] as [string, number][]).map(([l, v]) => {
                const [rt, rc] = rate5(v);
                return (
                  <div key={l} className="rounded-lg bg-[#f3ece7] py-1.5">
                    <div className="text-[10px] font-extrabold leading-tight" style={{ color: rc }}>{rt}</div>
                    <div className="text-[9.5px] text-muted mt-0.5">{l}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {opt.highlights.map((h, i) => (
            <p key={i} className="text-[11.5px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">ℹ {h}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 다음 액션 한 줄 ── */
function ActionRow({ icon: Icon, label, hint, open, onClick }: {
  icon: React.ElementType; label: string; hint?: string; open?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#faf5f2]">
      <Icon size={18} className="text-crimson" strokeWidth={2} />
      <span className="flex-1 text-[14px] font-bold text-ink">{label}</span>
      {hint && <span className="text-[10px] font-extrabold text-crimson bg-[#fdeef4] rounded-full px-2 py-0.5">{hint}</span>}
      {open === undefined
        ? <ChevronRight size={16} className="text-muted" />
        : <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />}
    </button>
  );
}

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [showAS, setShowAS] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((s) => {
        setData(s);
        // 진단 완료 → 내 가전 자동 등록(localStorage upsert)
        saveDevice({
          sessionId,
          product_type:   s.user_inputs.product_type,
          purchase_year:  s.user_inputs.purchase_year,
          capacity_kw:    s.user_inputs.capacity_kw,
          grade:          s.diagnosis.health_grade as string,
          score:          s.diagnosis.health_score as number,
          recommendation: s.report.recommendation_1st,
          savedAt:        Date.now(),
          age_years:      s.diagnosis.age_years as number,
          filter_months:  s.user_inputs.filter_clean_months,
        });
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error)
    return (
      <div className="text-center py-24 px-6 space-y-4">
        <p className="text-[14px] text-red-600">{error}</p>
        <Link href="/diagnose" className="text-crimson font-bold underline">다시 진단하기</Link>
      </div>
    );
  if (!data)
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted gap-3">
        <Loader2 className="animate-spin text-crimson" size={28} />
        <p className="text-[14px]">분석 중…</p>
      </div>
    );

  const d = data.diagnosis;
  const inputs = data.user_inputs;
  const r = data.report;
  const dom = (["비용", "환경", "편의"] as const)[
    [inputs.priority_cost_score, inputs.priority_env_score, inputs.priority_convenience_score].reduce((mi, v, i, a) => (v > a[mi] ? i : mi), 0)
  ];
  // final_score 내림차순 정렬 → index로 순위 부여 (백엔드 rank는 하드룰 전 값이라 stale)
  const ordered = [...data.ranked_options].sort((a, b) => b.final_score - a.final_score);
  const maxScore = ordered[0]?.final_score || 1;
  const top2 = ordered.slice(0, 2).map((o) => o.key);

  return (
    <div>
      {/* App bar */}
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/diagnose" className="text-crimson"><ChevronLeft size={22} /></Link>
        <div className="leading-tight">
          <h1 className="text-[16px] font-extrabold text-ink">진단 결과</h1>
          <p className="text-[10.5px] text-muted">{inputs.product_type} · {inputs.purchase_year}년식 · {d.age_years as number}년 사용 · {dom} 우선</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="reveal reveal-1"><GradeHero data={data} /></div>
        <div className="reveal reveal-2"><ElecCard data={data} /></div>

        {/* 1순위 추천 */}
        <div className="reveal reveal-3 rounded-[22px] p-5 text-white shadow-[var(--shadow-pop)]"
          style={{ background: "linear-gradient(140deg,#a50034,#76002a)" }}>
          <p className="text-[11px] font-semibold text-white/80">1순위 추천 (현재 입력 기준 추정)</p>
          <p className="text-[28px] font-extrabold mt-0.5" style={{ fontFamily: "var(--font-display)" }}>{r.recommendation_1st}</p>
          <p className="text-[12.5px] text-white/85 mt-1">2순위 대안 · {r.recommendation_2nd}</p>
          <p className="text-[12.5px] leading-relaxed text-white/95 mt-3 border-t border-white/20 pt-3">{r.reason_summary}</p>
        </div>

        {/* 판단 근거 */}
        <div className="reveal reveal-4">
          <h3 className="text-[13px] font-extrabold text-ink mb-2 px-1">판단 근거</h3>
          <div className="grid grid-cols-2 gap-2">
            {r.confidence_cards.map((c, i) => (
              <div key={i} className="rounded-xl bg-surface border border-line p-3 text-[12px] text-ink-soft shadow-[var(--shadow-card)]">{c}</div>
            ))}
          </div>
          {r.caution_notes.map((n, i) => (
            <p key={i} className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">{n}</p>
          ))}
        </div>

        {/* 5선택지 비교 */}
        <div className="reveal reveal-5">
          <h3 className="text-[13px] font-extrabold text-ink mb-2 px-1">5가지 선택지 비교 <span className="text-[11px] font-medium text-muted">5년 · {dom} 우선 반영</span></h3>
          <div className="space-y-2.5">
            {ordered.map((opt, i) => <OptionCard key={opt.key} opt={opt} rank={i + 1} max={maxScore} />)}
          </div>
        </div>

        {/* 탄소 */}
        <div className="reveal reveal-6 rounded-[22px] bg-surface border border-line p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-extrabold text-ink mb-3">🌱 탄소 영향</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["구형 5년", fmtCo2(data.carbon_summary.old_use_carbon_3y)], ["신형 5년", fmtCo2(data.carbon_summary.new_use_carbon_3y)], ["회수기간", `${data.carbon_summary.carbon_payback_years.toFixed(1)}년`]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-[#f3f6f2] py-2.5">
                <div className="text-[13px] font-extrabold text-ink">{v}</div>
                <div className="text-[10.5px] text-muted mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 다음 액션 */}
        <div className="reveal reveal-6">
          <h3 className="text-[13px] font-extrabold text-ink mb-2 px-1">다음 액션</h3>
          <div className="rounded-[20px] bg-surface border border-line shadow-[var(--shadow-card)] divide-y divide-line/70 overflow-hidden">
            {top2.includes("신제품구매") && (
              <ActionRow icon={ShoppingBag} label="추천 신제품 보기" hint="LG 연계" onClick={() => router.push(`/products/${sessionId}`)} />
            )}
            {top2.includes("구독전환") && (
              <ActionRow icon={Repeat} label="구독 상품 보기" hint="LG 연계" onClick={() => router.push(`/products/${sessionId}`)} />
            )}
            <ActionRow icon={MapPin} label="주변 서비스센터 찾기" onClick={() => router.push("/centers")} />
            <ActionRow icon={FileText} label="A/S Fast Pass 초안" open={showAS}
              onClick={() => setShowAS(!showAS)} />
            {showAS && (
              <div className="px-4 pb-4 pt-1 bg-[#faf5f2]">
                <pre className="text-[11.5px] text-ink-soft whitespace-pre-wrap leading-relaxed">{r.as_fast_pass_text}</pre>
                <button onClick={() => router.push(`/fastpass/${sessionId}`)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl text-white font-extrabold py-2.5 text-[13px]"
                  style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
                  <FileText size={15} /> 접수증 만들기 · PDF 저장
                </button>
                <p className="text-[10.5px] text-muted mt-2">※ 수리 권장 시 A/S 접수용 초안입니다.</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted text-center leading-relaxed pt-1">
          {(data.disclaimer as string) || "모든 수치는 현재 입력 조건 기준 추정 결과이며, 정확한 고장 예측이 아닙니다."}
        </p>
      </div>
    </div>
  );
}
