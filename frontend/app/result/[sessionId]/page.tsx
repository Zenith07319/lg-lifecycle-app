"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import { saveDevice } from "@/lib/myDevice";
import { GRADE_COLORS } from "@/lib/utils";
import { GlassCard, AppHeader, PrimaryButton } from "@/components/ui";
import { Megaphone, ChevronRight, ChevronDown } from "lucide-react";
import type { SessionData } from "@/lib/types";

// 건강 등급(상태)과 추천 액션(결정)은 다른 층위다.
// 결과 화면의 '권장' 배지는 등급 문구가 아니라 실제 1순위 추천 액션을 보여줘야
// 판단근거·결정가이드·홈·내 가전·A/S패스와 결론이 일치한다(화면 간 모순 제거).
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
const D = "Pretendard, sans-serif";

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [err, setErr] = useState("");
  const [showCalc, setShowCalc] = useState(false);   // '점수 계산' 토글

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      setData(s);
      const nowMs = Date.now();
      saveDevice({
        sessionId, product_type: s.user_inputs.product_type, purchase_year: s.user_inputs.purchase_year,
        capacity_kw: s.user_inputs.capacity_kw, grade: s.diagnosis.health_grade as string,
        score: s.diagnosis.health_score as number, recommendation: s.report.recommendation_1st,
        form: s.user_inputs.form_estimated, savedAt: nowMs,
        age_years: s.diagnosis.age_years as number, filter_months: s.user_inputs.filter_clean_months,
        // 낭비 심화 알림 기준선(진단 시점 고정)
        diagnosed_at: nowMs,
        energy_waste_ratio: s.diagnosis.energy_waste_ratio as number,
        ac_monthly_cost: s.delta_old.ac_delta_cost as number,
        usage_months: (s.user_inputs.usage_months as number) || 4,
      });
    }).catch((e) => setErr(e.message));
  }, [sessionId]);

  if (err) return <div className="px-6 py-24 text-center text-[14px] text-danger">{err}</div>;
  if (!data) return <div className="px-6 py-32 text-center text-muted">분석 중…</div>;

  const dg = data.diagnosis;
  const inp = data.user_inputs;
  const form = (inp.form_estimated as string) || "";   // 벽걸이/스탠드 추정
  const deviceName = `${form ? form + " " : ""}${inp.product_type}`;
  const grade = dg.health_grade as string;
  const score = Math.round(dg.health_score as number);
  const gColor = GRADE_COLORS[grade] ?? "#C23630";
  const age = dg.age_years as number;
  const oldC = data.delta_old.ac_delta_cost as number;
  const newC = data.delta_new.ac_delta_cost as number;
  const months = (inp.usage_months as number) || 4;
  const save5 = Math.max(0, (oldC - newC) * months * 5);
  const byInput = ((inp.ac_monthly_kwh_input as number) || 0) > 0;
  const changed = data.delta_old.tier_changed as boolean;
  const fmtTier = (s: unknown) => String(s ?? "").replace(/\s*구간/g, "").replace("~초과kWh", "kWh 초과").trim();
  const tierOld = fmtTier(data.delta_old.tier_with_ac);
  const tierNew = fmtTier(data.delta_new.tier_with_ac);
  const insp = Math.round(dg.inspection_score_100 as number);
  const waste = Math.round((dg.energy_waste_ratio as number) * 100);
  const extra = Math.max(0, oldC - newC);
  // 1순위 추천 액션 = 판단근거/결정가이드/홈/내 가전과 동일 소스(report.recommendation_1st)
  const ranked = [...(data.ranked_options ?? [])].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const rec1 = (data.report?.recommendation_1st as string) || ranked[0]?.label || "";
  const sel = data.selected_new_model ?? inp.selected_new_model;   // 사용자가 고른 신형 비교 기준(세션 user_inputs에 영속)
  const newLabel = "신형";   // 실제 등급은 아래 '비교 기준' 줄에 표기(1등급 단정 회피)
  const selMeta = sel ? [sel.grade, `월 ${sel.monthly_kwh}kWh`, won(sel.sale_price)].filter(Boolean).join(" · ") : "";

  return (
    <div className="pb-6">
      <AppHeader
        title="진단 결과"
        subtitle={`${deviceName} · 설치 ${age}년차 · 비용 우선`}
        right={
          <button
            onClick={() => setShowCalc((v) => !v)}
            aria-expanded={showCalc}
            className="flex items-center gap-1 pb-1 text-[11px] font-bold text-muted"
          >
            <Megaphone size={13} /> 점수 계산이 궁금하다면?
            <ChevronDown size={13} className={`transition-transform ${showCalc ? "rotate-180" : ""}`} />
          </button>
        }
      />

      <div className="space-y-4 px-5 pt-2">
        {/* 점수 계산 설명(토글) — 건강 점수 = 100 − (점검필요도45% + 에너지낭비30% + 사용불편25%) */}
        {showCalc && (
          <GlassCard className="p-4">
            <p className="text-[13px] font-extrabold text-ink">건강 점수는 이렇게 계산해요</p>
            <p className="mt-1 text-[11.5px] leading-snug text-muted">
              100점 만점, 높을수록 건강해요. 아래 3가지를 가중 합산해 100점에서 빼요.
            </p>
            <div className="mt-3 space-y-2.5">
              {[
                { emoji: "🔧", name: "점검 필요도", w: "45%", desc: "연식·증상·수리이력·필터 관리로 추정", val: `이번 ${insp}/100` },
                { emoji: "⚡", name: "에너지 낭비", w: "30%", desc: "같은 성능 신제품 대비 초과 전기 비율", val: `이번 ${waste}%` },
                { emoji: "😣", name: "사용 불편", w: "25%", desc: "소음·냄새·성능저하 등 증상 심각도", val: "" },
              ].map((r) => (
                <div key={r.name} className="flex items-start gap-2">
                  <span className="text-[15px] leading-none">{r.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-ink">
                      {r.name} <span className="text-accent">{r.w}</span>
                      {r.val && <span className="ml-1 text-[11px] font-semibold text-muted">· {r.val}</span>}
                    </p>
                    <p className="text-[10.5px] leading-snug text-muted">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2">
              <p className="text-[11px] font-bold text-ink-soft">등급 구간</p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">A 80↑ · B 65↑ · C 50↑ · D 35↑ · E 35 미만</p>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted">
              ※ 모든 수치는 입력 조건 기준 추정이며, 정확한 고장 예측이 아니에요.
            </p>
          </GlassCard>
        )}

        {/* 건강점수 + 등급 링 */}
        <section className="reveal reveal-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted">건강 점수</p>
              <p className="text-[72px] font-extrabold leading-[0.95] text-ink" style={{ fontFamily: D }}>{score}</p>
              <p className="mt-2.5 text-[13px] font-semibold text-muted">{deviceName} · 설치 {age}년차</p>
              {rec1 && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-extrabold text-accent">
                  💡 추천 · {rec1}
                </p>
              )}
            </div>
            <div className="shrink-0 text-center">
              <div className="relative size-[112px]" style={{ filter: `drop-shadow(0 8px 18px ${gColor}40)` }}>
                <svg viewBox="0 0 112 112" className="size-full -rotate-90">
                  <defs>
                    <linearGradient id="gradeRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor={gColor} stopOpacity="0.55" />
                      <stop offset="1" stopColor={gColor} />
                    </linearGradient>
                  </defs>
                  <circle cx="56" cy="56" r="48" fill="#fff" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#ece9e6" strokeWidth="9" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="url(#gradeRing)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - Math.min(score, 100) / 100)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="text-[42px] font-extrabold" style={{ fontFamily: D, color: gColor }}>{grade}</span>
                  <span className="mt-0.5 text-[10px] font-bold text-muted">{score}점</span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-muted">건강 등급</p>
            </div>
          </div>

          {/* 에어컨 일러스트 (중앙 밴드) */}
          <img src="/ac-illustration.png" alt="에어컨" className="mx-auto -mt-1 size-[140px] select-none object-contain" />

          {/* 인사 */}
          <div className="flex items-center gap-3">
            <img src="/character-head.png" alt="" className="size-10 shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(5,31,31,.12)]" />
            <p className="text-[15px] font-extrabold text-ink" style={{ fontFamily: D }}>
              매달 <span className="text-danger">전기요금{extra > 0 ? ` ${won(extra)}` : ""}</span>을 더 내고 있어요
            </p>
          </div>
        </section>

        {/* 전기요금 유리카드 */}
        <GlassCard className="reveal reveal-2 p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[12.5px] font-extrabold text-ink">전기요금 <span className="font-medium text-muted">(에어컨 기여 · 월)</span></h3>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold ${byInput ? "bg-accent-soft text-accent" : "bg-sunken text-muted"}`}>
              {byInput ? "입력값 기준" : "추정 기준"}
            </span>
          </div>
          {sel && (
            <p className="-mt-1.5 mb-2.5 text-[10.5px] font-semibold text-muted">
              비교 기준 · <span className="font-extrabold text-ink-soft">{sel.line}</span> ({selMeta})
            </p>
          )}
          <div className="flex items-stretch gap-2.5">
            <div className="flex-1 rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-semibold text-muted">내 에어컨</p>
              <p className="text-[19px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(oldC)}</p>
            </div>
            <div className="flex items-center text-[13px] font-bold text-muted">→</div>
            <div className="flex-1 rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-semibold text-muted">{newLabel}</p>
              <p className="text-[19px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(newC)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/60 px-4 py-2.5">
            <span className="text-[12px] font-semibold text-ink-soft">5년 절감 금액 (교체 시)</span>
            <span className="text-[15px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(save5)}</span>
          </div>
        </GlassCard>

        {/* 타일: 누진(왼쪽 큰) / 점검·낭비(오른쪽 스택) */}
        <div className="reveal reveal-3 grid grid-cols-2 items-stretch gap-2">
          <div className="flex flex-col rounded-2xl bg-white p-3.5 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-semibold text-muted">누진 구간 {changed ? "이동" : "유지"}</p>
            {changed ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5">
                <span className="text-[14px] font-bold text-ink">{tierOld}</span>
                <ChevronDown size={16} className="text-accent" />
                <span className="text-[14px] font-bold text-ink">{tierNew}</span>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-[16px] font-extrabold text-ink" style={{ fontFamily: D }}>유지</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-white px-3.5 py-3 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold text-muted">점검 필요도</p>
              <p className="text-[22px] font-extrabold leading-tight text-ink" style={{ fontFamily: D }}>{insp}</p>
            </div>
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-white px-3.5 py-3 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold text-muted">에너지 낭비</p>
              <p className="text-[22px] font-extrabold leading-tight text-ink" style={{ fontFamily: D }}>{waste}%</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="reveal reveal-4 pt-1">
          <PrimaryButton href={`/result/${sessionId}/basis`} icon={<ChevronRight size={17} />}>판단 근거 확인하기</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
