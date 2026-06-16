"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/api";
import { GlassCard, AppHeader, LgBadge } from "@/components/ui";
import {
  ShoppingBag, Repeat, Wrench, Sparkles, Power, MapPin, FileText,
  ChevronRight, CreditCard, AlertTriangle, Zap, TrendingDown, BadgeCheck,
} from "lucide-react";
import type { SessionData, OptionScore } from "@/lib/types";

const D = "Pretendard, sans-serif";
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
const OPT_ICON: Record<string, typeof Power> = {
  신제품구매: ShoppingBag, 구독전환: Repeat, 수리후사용: Wrench, 셀프케어: Sparkles, 계속사용: Power,
};

type CostCard = { icon: typeof Power; value: string; label: string; accent?: boolean };

// 옵션별 비용 분해 카드(초기비용 GlassCard와 동일 양식, 아이콘만 옵션에 맞게).
function costCards(opt: OptionScore, keepElec5y: number | null): CostCard[] {
  const elec5 = opt.elec_cost_5y ?? null;          // 5년 전기비 (구버전 세션은 없음)
  const optc5 = opt.option_cost_5y ?? 0;           // 옵션 고유비 5년
  const init = opt.initial_cost ?? 0;
  const elecCard: CostCard[] = elec5 != null ? [{ icon: Zap, value: won(elec5), label: "전기 비용 (5년)" }] : [];
  switch (opt.key) {
    case "계속사용":
      return [...elecCard];
    case "셀프케어":
      return [{ icon: Sparkles, value: won(init), label: "셀프케어 비용 (연 1회 관리)" }, ...elecCard];
    case "수리후사용":
      return [{ icon: Wrench, value: won(init), label: "수리 예상 비용" }];
    case "구독전환":
      return [
        ...(optc5 > 0 ? [{ icon: Repeat, value: won(optc5), label: "5년 구독 비용" } as CostCard] : []),
        ...elecCard,
      ];
    case "신제품구매": {
      const cards: CostCard[] = [{ icon: ShoppingBag, value: won(init), label: "구매 비용" }, ...elecCard];
      if (elec5 != null && keepElec5y != null && keepElec5y > elec5)
        cards.push({ icon: TrendingDown, value: "−" + won(keepElec5y - elec5), label: "기존 가전 대비 전기 절감 (5년)", accent: true });
      return cards;
    }
    default:
      return init ? [{ icon: CreditCard, value: won(init), label: "초기비용" }] : [];
  }
}

// 옵션 특이 안내(구독 특징 / 계속 사용 수리비 미반영) — 초록 톤 정보 카드.
function noteOf(opt: OptionScore): string | null {
  if (opt.key === "구독전환") return "LG 가전 구독 — 계약 기간이 끝나면 내 소유가 되고, 12개월마다 1회 방문 케어 서비스를 받아요.";
  if (opt.key === "계속사용") return "5년 총비용은 전기 비용 기준이에요. 노후로 고장 시 수리비가 따로 들 수 있어요(미반영).";
  return null;
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

  const dom = (["비용", "환경", "편의"] as const)[
    [data.user_inputs.priority_cost_score, data.user_inputs.priority_env_score, data.user_inputs.priority_convenience_score]
      .reduce((mi, v, i, a) => (v > a[mi] ? i : mi), 0)
  ];
  const ordered: OptionScore[] = [...data.ranked_options].sort((a, b) => b.final_score - a.final_score);
  const opt = ordered[sel];
  const Icon = OPT_ICON[opt.key] ?? Power;
  const score = Math.round(opt.final_score * 100);
  // '계속 사용'의 5년 전기비 = 교체 절감 비교 기준
  const keepElec5y = ordered.find((o) => o.key === "계속사용")?.elec_cost_5y ?? null;
  const cards = costCards(opt, keepElec5y);
  const note = noteOf(opt);

  const next = [
    { icon: ShoppingBag, label: "추천 신제품", sub: "구매 · LG 신형", href: `/products/${sessionId}?mode=buy`, lg: true },
    { icon: Repeat, label: "구독 상품 보기", sub: "케어십 포함 구독", href: `/products/${sessionId}?mode=sub`, lg: true },
    { icon: MapPin, label: "주변 서비스센터", sub: "수리 · 점검 예약", href: "/centers", lg: false },
    { icon: FileText, label: "A/S Fast Pass", sub: "상태 요약 PDF", href: `/fastpass/${sessionId}`, lg: false },
  ];

  return (
    <div className="pb-6">
      <AppHeader title="결정 가이드" subtitle={`5년 기준 · ${dom} 우선 반영`} back />

      <div className="px-5 pt-2">
        <div className="flex gap-3">
          {/* 선택 옵션 정보 */}
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-green-050 px-2.5 py-0.5 text-[13px] font-bold text-ink-soft">{score}점</span>
            <p className="mt-3 text-[13px] font-bold text-[rgba(0,0,0,.3)]">{sel + 1}순위</p>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft"><Icon size={16} className="text-accent" /></span>
              <p className="text-[20px] font-extrabold text-ink">{opt.label}</p>
            </div>
            <p className="mt-1 text-[20px] font-extrabold text-accent" style={{ fontFamily: D }}>{won(opt.three_year_cost)}</p>
            <p className="text-[10px] font-semibold text-muted">5년 총비용</p>

            {/* 옵션별 비용 분해 카드(전부 초기비용과 동일 양식) */}
            <div className="mt-3 space-y-2">
              {cards.map((c) => {
                const Ic = c.icon;
                return (
                  <GlassCard key={c.label} className="flex items-center gap-2.5 !bg-white/55 px-3.5 py-2.5">
                    <Ic size={20} className={c.accent ? "text-success" : "text-accent"} strokeWidth={1.8} />
                    <div>
                      <p className={`text-[12px] font-semibold ${c.accent ? "text-success" : "text-ink"}`}>{c.value}</p>
                      <p className="text-[9px] text-muted">{c.label}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            {/* 옵션 특이 안내(구독 특징 / 계속 사용 수리비 미반영) */}
            {note && (
              <div className="mt-2 flex items-start gap-2 rounded-2xl bg-accent-soft px-3 py-2.5">
                <BadgeCheck size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2} />
                <p className="text-[10.5px] font-semibold leading-snug text-ink-soft">{note}</p>
              </div>
            )}

            {/* 관리 필요 옵션(셀프케어·계속사용) → 관리 가이드로 이동 (초기비용 카드와 동일 양식, 아이콘만 변경) */}
            {(opt.key === "셀프케어" || opt.key === "계속사용") && (
              <Link href="/guide">
                <GlassCard className="mt-2 flex items-center gap-2.5 !bg-white/55 px-3.5 py-2.5 active:scale-[.99] transition">
                  <Sparkles size={20} className="text-accent" strokeWidth={1.8} />
                  <div>
                    <p className="text-[12px] font-semibold text-ink">관리 가이드 보기</p>
                    <p className="text-[9px] text-muted">필터 청소·관리로 상태 개선</p>
                  </div>
                  <ChevronRight size={15} className="ml-auto shrink-0 text-ink-300" />
                </GlassCard>
              </Link>
            )}

            {/* 경고/안내 */}
            {opt.highlights?.map((h, i) => (
              <div key={i} className="mt-2 flex items-start gap-2 rounded-2xl bg-white/55 px-3 py-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-lg-red" strokeWidth={2} />
                <p className="text-[10.5px] font-semibold leading-snug text-ink-soft">{h}</p>
              </div>
            ))}
          </div>

          {/* 우측 1~5 셀렉터 */}
          <div className="flex flex-col gap-2.5 pt-1">
            {ordered.map((_, i) => (
              <button
                key={i}
                onClick={() => setSel(i)}
                aria-label={`${i + 1}순위`}
                className={`flex size-9 items-center justify-center rounded-full text-[16px] font-extrabold transition ${
                  i === sel ? "bg-accent text-white shadow-[0_4px_12px_rgba(4,125,134,.3)]" : "bg-white text-accent shadow-[var(--shadow-card)]"
                }`}
                style={{ fontFamily: D }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* 다음 단계 */}
        <p className="mb-2 mt-6 text-[10px] font-semibold text-muted">다음 단계</p>
        <div className="grid grid-cols-2 gap-2.5">
          {next.map(({ icon: I, label, sub, href, lg }) => (
            <Link key={label} href={href} className="relative rounded-[14px] bg-white/80 p-3.5 shadow-[var(--shadow-card)] backdrop-blur-sm active:scale-[.99] transition">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft"><I size={20} className="text-accent" strokeWidth={1.9} /></div>
              <ChevronRight size={15} className="absolute right-3 top-4 text-ink-300" />
              <p className="mt-3 text-[13px] font-bold text-ink">{label}</p>
              <p className="text-[10px] font-semibold text-muted">{sub}</p>
              {lg && <div className="mt-2"><LgBadge /></div>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
