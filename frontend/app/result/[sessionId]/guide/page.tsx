"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/api";
import { AppHeader } from "@/components/ui";
import {
  ShoppingBag, Repeat, Wrench, Sparkles, Power,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import type { SessionData, OptionScore } from "@/lib/types";

const D = "Pretendard, sans-serif";
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
const OPT_ICON: Record<string, typeof Power> = {
  신제품구매: ShoppingBag, 구독전환: Repeat, 수리후사용: Wrench, 셀프케어: Sparkles, 계속사용: Power,
};

type Ctx = { sessionId: string; oldC: number; newC: number; saveYr: number; save5: number; grade: string; wasteCur: number; carbonPayback: number };

/* 옵션별로 '그 선택을 가르는' 데이터 1+보조 2 + 맞춤 행동 링크 1개.
   당연한 값(초기비용 0)·내부 점수(0~1)는 노출하지 않고, 어려운 값은 쉬운 말로 번역. */
function detailOf(opt: OptionScore, c: Ctx): {
  who: string; hero: { value: string; label: string }; rows: { label: string; value: string }[];
  risk?: string; link: { href: string; label: string };
} {
  const init = opt.initial_cost || 0;
  const wasteAfter = Math.round((opt.energy_waste_after ?? 0) * 100);
  switch (opt.key) {
    case "계속사용":
      return {
        who: "당장 목돈은 피하고 싶을 때",
        hero: { value: "+" + won(c.save5), label: "5년간 1등급 신형보다 더 내는 전기료" },
        rows: [
          { label: "현재 월 전기료", value: won(c.oldC) },
          { label: "건강 등급", value: `${c.grade}등급 (상태 신호)` },
        ],
        link: { href: "/guide", label: "전기료 줄이는 관리법 보기" },
      };
    case "셀프케어":
      return {
        who: "적은 비용으로 우선 개선하고 싶을 때",
        hero: { value: `낭비 ${c.wasteCur}% → ${wasteAfter}%`, label: "필터·간단 관리 후 예상 에너지 낭비" },
        rows: [
          { label: "예상 관리비", value: init ? won(init) : "소액(필터 청소 등)" },
          { label: "한계", value: "노후로 생긴 부분은 그대로예요" },
        ],
        link: { href: "/guide#filter", label: "필터 청소 방법 보기" },
      };
    case "수리후사용":
      return {
        who: "초기비용을 아끼며 더 쓰고 싶을 때",
        hero: { value: won(init), label: "예상 수리비 (초기 1회)" },
        rows: [
          { label: "수리 후 에너지 낭비", value: `${c.wasteCur}% → ${wasteAfter}%` },
          { label: "5년 총비용", value: won(opt.three_year_cost) },
        ],
        risk: opt.highlights?.[0],
        link: { href: "/centers", label: "주변 서비스센터 찾기" },
      };
    case "구독전환":
      return {
        who: "목돈 없이 신형과 관리까지 맡기고 싶을 때",
        hero: { value: "월 약 " + won(opt.three_year_cost / 60), label: "5년 평균 월 부담 (총 " + won(opt.three_year_cost) + ")" },
        rows: [
          { label: "초기비용", value: "없음 (목돈 부담 0)" },
          { label: "포함", value: "설치·정기 세척·보증 케어" },
        ],
        link: { href: `/products/${c.sessionId}?mode=sub`, label: "구독 상품 보기" },
      };
    case "신제품구매": {
      const payback = c.saveYr > 0 ? init / c.saveYr : 0;
      return {
        who: "길게 보고 전기료를 확 줄이고 싶을 때",
        hero: payback > 0
          ? { value: `약 ${payback.toFixed(1)}년`, label: "전기료 절감으로 구매가 회수(본전) 시점" }
          : { value: won(init), label: "구매가 (초기 1회)" },
        rows: [
          { label: "구매가", value: won(init) },
          { label: "전기료 절감", value: `월 ${won(Math.max(0, c.oldC - c.newC))} ↓` },
          ...(c.carbonPayback ? [{ label: "탄소 회수", value: `약 ${c.carbonPayback}년` }] : []),
        ],
        link: { href: `/products/${c.sessionId}?mode=buy`, label: "추천 신제품 보기" },
      };
    }
    default:
      return { who: "", hero: { value: won(opt.three_year_cost), label: "5년 총비용" }, rows: [], link: { href: `/result/${c.sessionId}`, label: "결과로" } };
  }
}

export default function GuidePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(0);
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(setData).catch((e) => setErr(e.message));
  }, [sessionId]);

  if (err) return <div className="px-6 py-24 text-center text-[14px] text-danger">{err}</div>;
  if (!data) return <div className="px-6 py-32 text-center text-muted">불러오는 중…</div>;

  const inp = data.user_inputs;
  const dom = (["비용", "환경", "편의"] as const)[
    [inp.priority_cost_score, inp.priority_env_score, inp.priority_convenience_score]
      .reduce((mi, v, i, a) => (v > a[mi] ? i : mi), 0)
  ];
  const months = (inp.usage_months as number) || 4;
  const oldC = data.delta_old.ac_delta_cost as number;
  const newC = data.delta_new.ac_delta_cost as number;
  const saveYr = Math.max(0, (oldC - newC) * months);
  const ctx: Ctx = {
    sessionId, oldC, newC, saveYr, save5: saveYr * 5,
    grade: data.diagnosis.health_grade as string,
    wasteCur: Math.round((data.diagnosis.energy_waste_ratio as number) * 100),
    carbonPayback: data.carbon_summary.carbon_payback_years,
  };

  const ordered: OptionScore[] = [...data.ranked_options].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const opt = ordered[sel];
  const Icon = OPT_ICON[opt.key] ?? Power;
  const d = detailOf(opt, ctx);

  return (
    <div className="pb-10">
      <AppHeader title="결정 가이드" subtitle={`5년 기준 · ${dom} 우선 반영`} back />

      <div className="px-5 pt-2">
        <div className="flex gap-3">
          {/* 선택 옵션 상세 */}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[rgba(0,0,0,.32)]">{sel + 1}순위{sel === 0 ? " · 추천" : ""}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft"><Icon size={16} className="text-accent" /></span>
              <p className="text-[20px] font-extrabold text-ink">{opt.label}</p>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-muted">{d.who}</p>

            {/* 핵심 숫자 */}
            <div className="mt-3 rounded-[16px] bg-accent-soft px-4 py-3">
              <p className="text-[22px] font-extrabold leading-tight text-accent" style={{ fontFamily: D }}>{d.hero.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-snug text-ink-soft">{d.hero.label}</p>
            </div>

            {/* 보조 지표 */}
            <div className="mt-2 space-y-1.5">
              {d.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2 rounded-xl bg-white/60 px-3.5 py-2">
                  <span className="text-[11px] font-semibold text-muted">{r.label}</span>
                  <span className="text-right text-[12px] font-bold text-ink">{r.value}</span>
                </div>
              ))}
            </div>

            {/* 리스크/주의 */}
            {d.risk && (
              <div className="mt-2 flex items-start gap-2 rounded-2xl border border-[#F1E3BC] bg-[#FDF3DF] px-3 py-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" strokeWidth={2.2} />
                <p className="text-[10.5px] font-semibold leading-snug text-ink-soft">{d.risk}</p>
              </div>
            )}
          </div>

          {/* 우측 1~5 순위 셀렉터 */}
          <div className="flex flex-col gap-2.5 pt-1">
            {ordered.map((_, i) => (
              <button key={i} onClick={() => setSel(i)} aria-label={`${i + 1}순위`}
                className={`flex size-9 items-center justify-center rounded-full text-[16px] font-extrabold transition ${
                  i === sel ? "bg-accent text-white shadow-[0_4px_12px_rgba(4,125,134,.3)]" : "bg-white text-accent shadow-[var(--shadow-card)]"
                }`} style={{ fontFamily: D }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* 옵션별 맞춤 행동 1개 */}
        <Link href={d.link.href}
          className="mt-6 flex items-center justify-between rounded-[16px] bg-accent px-5 py-4 text-white shadow-[0_8px_22px_rgba(4,125,134,.30)] active:scale-[.99] transition">
          <span className="text-[15px] font-extrabold">{d.link.label}</span>
          <ChevronRight size={20} />
        </Link>
        <p className="px-1 pt-3 text-center text-[10px] leading-relaxed text-muted">
          모든 수치는 현재 입력 조건 기준 추정이며, 5년·{dom} 우선으로 계산했어요.
        </p>
      </div>
    </div>
  );
}
