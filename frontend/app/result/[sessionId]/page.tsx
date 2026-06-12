"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import { saveDevice } from "@/lib/myDevice";
import { GRADE_COLORS } from "@/lib/utils";
import { GlassCard, AppHeader, PrimaryButton } from "@/components/ui";
import { Megaphone, ChevronRight } from "lucide-react";
import type { SessionData } from "@/lib/types";

const URGENT: Record<string, string> = {
  A: "계속 사용 적합", B: "셀프케어 권장", C: "점검 권장", D: "교체 검토 권장", E: "즉시 점검 권장",
};
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
const D = "Pretendard, sans-serif";

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      setData(s);
      saveDevice({
        sessionId, product_type: s.user_inputs.product_type, purchase_year: s.user_inputs.purchase_year,
        capacity_kw: s.user_inputs.capacity_kw, grade: s.diagnosis.health_grade as string,
        score: s.diagnosis.health_score as number, recommendation: s.report.recommendation_1st,
        savedAt: Date.now(), age_years: s.diagnosis.age_years as number, filter_months: s.user_inputs.filter_clean_months,
      });
    }).catch((e) => setErr(e.message));
  }, [sessionId]);

  if (err) return <div className="px-6 py-24 text-center text-[14px] text-danger">{err}</div>;
  if (!data) return <div className="px-6 py-32 text-center text-muted">분석 중…</div>;

  const dg = data.diagnosis;
  const inp = data.user_inputs;
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
  const tierOld = String(data.delta_old.tier_with_ac ?? "").replace(/\s*구간/g, "");
  const tierNew = String(data.delta_new.tier_with_ac ?? "").replace(/\s*구간/g, "");
  const insp = Math.round(dg.inspection_score_100 as number);
  const waste = Math.round((dg.energy_waste_ratio as number) * 100);
  const extra = Math.max(0, oldC - newC);

  return (
    <div className="pb-6">
      <AppHeader
        title="진단 결과"
        subtitle={`${inp.product_type} · 설치 ${age}년차 · 비용 우선`}
        right={
          <button className="flex items-center gap-1 pb-1 text-[11px] font-bold text-muted">
            <Megaphone size={13} /> 점수 계산이 궁금하다면?
          </button>
        }
      />

      <div className="space-y-4 px-5 pt-2">
        {/* 건강점수 + 등급 링 + 일러스트 */}
        <section className="reveal reveal-1 relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted">건강 점수</p>
              <p className="text-[68px] font-extrabold leading-none text-ink" style={{ fontFamily: D }}>{score}</p>
              <p className="mt-2 text-[13px] font-semibold text-muted">{inp.product_type} · 설치 {age}년차</p>
              <p className="mt-0.5 text-[12.5px] font-semibold" style={{ color: gColor }}>{URGENT[grade] ?? (dg.grade_description as string)}</p>
            </div>
            <div className="shrink-0 text-center">
              <div className="flex size-[100px] items-center justify-center rounded-full" style={{ background: gColor }}>
                <span className="text-[44px] font-extrabold text-white" style={{ fontFamily: D }}>{grade}</span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-muted">건강 등급</p>
            </div>
          </div>
          {/* 에어컨 일러스트 + 인사 */}
          <div className="mt-2 flex items-center gap-3">
            <img src="/avatar.png" alt="" className="size-12 shrink-0 rounded-full object-cover" />
            <p className="text-[14.5px] font-extrabold text-ink" style={{ fontFamily: D }}>
              매달 <span className="text-danger">전기요금{extra > 0 ? ` ${won(extra)}` : ""}</span>을 더 내고 있어요
            </p>
          </div>
          <img src="/ac-illustration.png" alt="에어컨" aria-hidden className="pointer-events-none absolute right-2 top-[88px] size-[120px] object-contain opacity-95" />
        </section>

        {/* 전기요금 유리카드 */}
        <GlassCard className="reveal reveal-2 p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[12.5px] font-extrabold text-ink">전기요금 <span className="font-medium text-muted">(에어컨 기여 · 월)</span></h3>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold ${byInput ? "bg-accent-soft text-accent" : "bg-sunken text-muted"}`}>
              {byInput ? "입력값 기준" : "추정 기준"}
            </span>
          </div>
          <div className="flex items-stretch gap-2.5">
            <div className="flex-1 rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-semibold text-muted">내 에어컨</p>
              <p className="text-[19px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(oldC)}</p>
            </div>
            <div className="flex items-center text-[13px] font-bold text-muted">→</div>
            <div className="flex-1 rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-semibold text-muted">1등급 신형</p>
              <p className="text-[19px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(newC)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/60 px-4 py-2.5">
            <span className="text-[12px] font-semibold text-ink-soft">5년 절감 금액 (교체 시)</span>
            <span className="text-[15px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(save5)}</span>
          </div>
        </GlassCard>

        {/* 타일: 누진 / 점검 / 낭비 */}
        <div className="reveal reveal-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-[var(--shadow-card)]">
            <p className="mb-1 text-[10px] font-semibold text-muted">누진 구간 {changed ? "이동" : "유지"}</p>
            {changed ? (
              <p className="text-[11.5px] font-extrabold leading-tight text-ink">{tierOld}<br /><span className="text-accent">↓ {tierNew}</span></p>
            ) : (
              <p className="mt-1.5 text-[15px] font-extrabold text-ink" style={{ fontFamily: D }}>유지</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-[var(--shadow-card)]">
            <p className="mb-1 text-[10px] font-semibold text-muted">점검 필요도</p>
            <p className="text-[20px] font-extrabold text-ink" style={{ fontFamily: D }}>{insp}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-[var(--shadow-card)]">
            <p className="mb-1 text-[10px] font-semibold text-muted">에너지 낭비</p>
            <p className="text-[20px] font-extrabold text-ink" style={{ fontFamily: D }}>{waste}%</p>
          </div>
        </div>

        {/* CTA */}
        <div className="reveal reveal-4 pt-1">
          <PrimaryButton icon={<ChevronRight size={17} />}>판단 근거 확인하기</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
