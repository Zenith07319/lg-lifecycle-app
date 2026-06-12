"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Snowflake, Repeat, Loader2 } from "lucide-react";
import { AppHeader, LgBadge } from "@/components/ui";
import { getSession, getProducts } from "@/lib/api";
import type { SessionData, CatalogItem } from "@/lib/types";
import { fmt } from "@/lib/utils";

const withUtm = (url: string) =>
  url + (url.includes("?") ? "&" : "?") + "utm_source=ROR&utm_medium=recommend";

export default function ProductsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [tab, setTab] = useState<"buy" | "sub">("buy");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (sessionId) getSession(sessionId).then(setData).catch(() => {}); }, [sessionId]);

  const capRaw = (data?.user_inputs.capacity_kw as number) ?? 3.6;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProducts(capRaw, tab)
      .then((r) => { if (alive) setItems(r.items); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [capRaw, tab]);

  const months = (data?.user_inputs.usage_months as number) ?? 4;
  const oldC = (data?.delta_old.ac_delta_cost as number) ?? 0;
  const newC = (data?.delta_new.ac_delta_cost as number) ?? 0;
  const save5 = Math.max(0, (oldC - newC) * months * 5);

  return (
    <div className="pb-28">
      <div className="px-6 pt-4">
        <Link href={`/result/${sessionId}`} className="-ml-1 flex items-center text-ink-soft" aria-label="뒤로">
          <ChevronLeft size={24} />
        </Link>
      </div>
      <AppHeader
        title="추천 제품"
        subtitle={tab === "buy" ? "교체 경로 · 진단값에 맞춘 1등급 제품" : "우리집 가전에 맞는 구독 상품 살펴보기"}
        right={<LgBadge />}
      />

      <div className="px-6 pt-3">
        {/* 구매 / 구독 탭 토글 */}
        <div className="reveal reveal-1 flex gap-2">
          {([["buy", "신제품 구매", Snowflake], ["sub", "구독", Repeat]] as const).map(([t, l, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border py-3 text-[13px] font-bold transition active:scale-[.99] ${
                tab === t
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-white/60 text-muted"
              }`}>
              <Icon size={15} strokeWidth={2.4} />{l}
            </button>
          ))}
        </div>

        {/* 절감 안내 배너 */}
        <div className="reveal reveal-2 mt-3 rounded-[16px] bg-accent-soft px-4 py-3.5 text-[12px] leading-relaxed text-ink-soft">
          내 에어컨(<b>{capRaw}kW</b>)에 맞는 1등급 제품 · 교체 시 여름철 5년 전기료 절감 약{" "}
          <b className="text-accent">{fmt(save5)}</b>
        </div>

        {loading ? (
          <p className="py-16 text-center text-[13px] text-muted">
            <Loader2 className="mr-1 inline animate-spin" size={14} />불러오는 중…
          </p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted">해당 용량의 추천 제품을 준비 중이에요.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {items.map((p) => (
              <div key={p.model_code}
                className="reveal flex gap-3.5 rounded-[18px] bg-white/64 p-3.5 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
                {/* 이미지 밴드 */}
                <div className={`flex size-[88px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br shadow-[inset_0_0_0_1px_rgba(255,255,255,.6)] ${
                  tab === "buy" ? "from-[#eef1f6] to-[#e1e7f0]" : "from-accent-soft to-[#d3edee]"
                }`}>
                  {tab === "buy"
                    ? <Snowflake size={34} className="text-accent/70" strokeWidth={1.8} />
                    : <Repeat size={32} className="text-accent" strokeWidth={1.8} />}
                </div>

                {/* 본문 */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 text-[14px] font-extrabold leading-snug text-ink">{p.model_name}</h3>
                    {p.form && (
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold text-accent">{p.form}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted">냉방 {p.capacity_kw}kW · {p.model_code}</p>

                  {/* 가격 */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted">{tab === "buy" ? "판매가(참고)" : "월 구독료"}</span>
                    <div className="text-right">
                      {tab === "buy" && p.list_price && p.price && p.list_price > p.price && (
                        <span className="mr-1.5 text-[10.5px] text-muted line-through">{fmt(p.list_price)}</span>
                      )}
                      <span className="text-[15px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>
                        {tab === "buy"
                          ? (p.price ? fmt(p.price) : "LG에서 확인")
                          : (p.monthly_fee ? `${fmt(p.monthly_fee)}/월` : "LG에서 확인")}
                      </span>
                    </div>
                  </div>

                  {/* 그린 절감 박스 */}
                  <div className="mt-2 rounded-[10px] bg-[#eef8f0] px-3 py-2 text-[11.5px] font-bold leading-snug text-[#1a7f3c]">
                    {tab === "buy"
                      ? `교체 시 여름철 5년 전기료 절감 약 ${fmt(save5)} · 용량 적합`
                      : "초기비용 0원 · 신형 효율로 전기료 ↓ · 설치·관리 포함"}
                  </div>

                  {/* LG CTA */}
                  <a href={withUtm(p.product_url)} target="_blank" rel="noopener"
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-[12px] border border-accent py-2.5 text-[13px] font-extrabold text-accent active:scale-[.99] transition">
                    {tab === "buy" ? "LG에서 보기" : "LG 구독 상담"} <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 px-1 text-[10px] leading-relaxed text-muted">
          ※ 표시가는 LG.com 기준 <b>참고 판매가</b>이며, 실제 가격·재고·프로모션·구독료는 [LG에서 보기]에서 확인하세요. 추천은 용량 적합도 기반 비교입니다.
        </p>
      </div>
    </div>
  );
}
