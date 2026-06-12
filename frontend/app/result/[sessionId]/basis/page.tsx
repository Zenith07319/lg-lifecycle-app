"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import { GlassCard, AppHeader, PrimaryButton } from "@/components/ui";
import { Clock, Wrench, Activity, ShieldAlert, Layers, Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import type { SessionData } from "@/lib/types";

const D = "Pretendard, sans-serif";

export default function BasisPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(setData).catch((e) => setErr(e.message));
  }, [sessionId]);

  if (err) return <div className="px-6 py-24 text-center text-[14px] text-danger">{err}</div>;
  if (!data) return <div className="px-6 py-32 text-center text-muted">불러오는 중…</div>;

  const dg = data.diagnosis;
  const inp = data.user_inputs;
  const r = data.report;
  const age = dg.age_years as number;
  const repair = (inp.repair_history_count as number) || 0;
  const filterM = (inp.filter_clean_months as number) || 0;
  const insp = Math.round(dg.inspection_score_100 as number);
  const waste = Math.round((dg.energy_waste_ratio as number) * 100);
  const symptoms = ((inp.symptoms as { type: string; severity: number }[]) || []).filter((s) => s.type && s.type !== "증상없음");
  const symptomLabel = symptoms.length ? symptoms.map((s) => s.type).join(" · ") : "특이 증상 없음";

  // 종합 상태 한 줄 요약 (데이터 기반)
  const summary = [
    symptoms.length ? "증상 있음" : "현재 작동 정상",
    `점검 필요도 ${insp >= 50 ? "높음" : insp >= 30 ? "보통" : "낮음"}`,
    `에너지 낭비 ${waste >= 30 ? "높음" : waste >= 15 ? "보통" : "낮음"}`,
  ].join(" · ");

  const TONE = {
    neutral: { bg: "bg-accent-soft", ic: "text-accent", val: "text-accent" },
    warn: { bg: "bg-[#FDF3DF]", ic: "text-[#9A6700]", val: "text-[#9A6700]" },
    bad: { bg: "bg-[#FBECEC]", ic: "text-danger", val: "text-danger" },
  } as const;

  const rows: { icon: typeof Clock; label: string; value: string; tone: keyof typeof TONE }[] = [
    { icon: Clock, label: "사용 기간", value: `${age}년`, tone: "neutral" },
    { icon: Wrench, label: "수리 이력", value: `${repair}회`, tone: "neutral" },
    { icon: Activity, label: "주요 증상", value: symptomLabel, tone: "neutral" },
    { icon: ShieldAlert, label: "점검 필요도", value: `${insp}점`, tone: "warn" },
    { icon: Layers, label: "필터 미교체", value: `${filterM}개월`, tone: "warn" },
    { icon: Zap, label: "에너지 효율", value: `+${waste}% 소비 추정`, tone: "bad" },
  ];

  return (
    <div className="pb-6">
      <AppHeader title="판단 근거" subtitle="가전의 종합 상태를 확인해보세요" back />

      <div className="space-y-3.5 px-5 pt-2">
        {/* 종합 추천 */}
        <button className="reveal reveal-1 flex w-full items-center justify-between rounded-2xl border-2 border-accent/80 bg-white/70 px-4 py-3 text-left">
          <div>
            <p className="text-[10px] font-semibold text-muted">종합 추천</p>
            <p className="text-[18px] font-extrabold text-ink">{r.recommendation_1st}</p>
            <p className="text-[10px] font-semibold text-muted">현재 조건 기준 추정</p>
          </div>
          <ChevronRight size={22} className="text-accent" strokeWidth={2.5} />
        </button>

        {/* 상태 리스트 */}
        <GlassCard className="reveal reveal-2 overflow-hidden">
          {rows.map(({ icon: Icon, label, value, tone }, i) => {
            const t = TONE[tone];
            return (
              <div key={label} className={`flex items-center gap-3 px-4 py-3 ${i < rows.length - 1 ? "border-b border-line/70" : ""}`}>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-[11px] ${t.bg}`}>
                  <Icon size={18} className={t.ic} strokeWidth={1.9} />
                </div>
                <span className="flex-1 text-[13.5px] font-bold text-ink">{label}</span>
                <span className={`text-[13px] font-extrabold ${t.val}`} style={{ fontFamily: D }}>{value}</span>
              </div>
            );
          })}
        </GlassCard>

        {/* 그린 요약 */}
        <div className="reveal reveal-3 flex items-center gap-2.5 rounded-2xl bg-green-050 px-4 py-3">
          <CheckCircle2 size={18} className="shrink-0 text-success" strokeWidth={2} />
          <p className="text-[12px] font-bold text-success">{summary}</p>
        </div>

        {/* CTA */}
        <div className="reveal reveal-4 pt-1">
          <PrimaryButton href={`/result/${sessionId}/guide`} icon={<ChevronRight size={17} />}>추천 우선순위 보기</PrimaryButton>
        </div>

        <p className="px-1 pt-1 text-[10px] leading-relaxed text-muted">
          ※ 모든 수치는 현재 입력 조건 기준 추정값이며, 정확한 고장 예측이 아닙니다.
        </p>
      </div>
    </div>
  );
}
