"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Snowflake, Repeat, Loader2 } from "lucide-react";
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
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href={`/result/${sessionId}`} className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">추천 제품</h1>
        <span className="ml-auto text-[11px] text-muted">LG 연계</span>
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 mb-3">
          {([["buy", "🛒 신제품 구매"], ["sub", "🔁 구독"]] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-xl border py-2.5 text-[13px] font-bold ${tab === t ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-muted"}`}>{l}</button>
          ))}
        </div>

        <div className="rounded-xl bg-[#faf5f2] border border-line px-4 py-3 mb-3 text-[12px] text-ink-soft">
          💡 내 에어컨(<b>{capRaw}kW</b>)에 맞는 1등급 제품 · 교체 시 여름철 5년 전기료 절감 약{" "}
          <b className="text-crimson">{fmt(save5)}</b>
        </div>

        {loading ? (
          <p className="text-center text-muted text-[13px] py-12"><Loader2 className="inline animate-spin mr-1" size={14} />불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted text-[13px] py-12">해당 용량의 추천 제품을 준비 중이에요.</p>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.model_code} className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
                <div className={`h-20 rounded-xl flex items-center justify-center mb-3 ${tab === "buy" ? "bg-gradient-to-br from-[#eef1f6] to-[#e1e7f0]" : "bg-gradient-to-br from-[#fdeef4] to-[#f7d4e2]"}`}>
                  {tab === "buy" ? <Snowflake size={32} className="text-crimson/70" /> : <Repeat size={30} className="text-crimson" />}
                </div>
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 text-[14px] font-extrabold text-ink leading-snug">{p.model_name}</h3>
                  {p.tag && <span className="text-[10px] font-extrabold text-crimson bg-[#fdeef4] rounded-full px-2 py-0.5 shrink-0">{p.tag}</span>}
                </div>
                <p className="text-[11.5px] text-muted mt-0.5">{p.model_code} · {p.area_pyeong}평형 · {p.energy_grade}등급</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted">{tab === "buy" ? "참고 출고가" : "월 구독료"}</span>
                  <span className="text-[15px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>
                    {tab === "buy"
                      ? (p.price ? fmt(p.price) : "LG에서 확인")
                      : (p.monthly_fee ? `${fmt(p.monthly_fee)}/월` : "LG에서 확인")}
                  </span>
                </div>
                <div className="rounded-lg bg-[#eef8f0] text-[#1a7f3c] text-[11.5px] font-bold px-3 py-2 mt-2">
                  {tab === "buy"
                    ? `💰 5년 전기료 절감 약 ${fmt(save5)} · 용량 적합 + 1등급`
                    : "💰 초기비용 0원 · 신형 효율로 전기료 ↓ · 설치·관리 포함"}
                </div>
                <a href={withUtm(p.product_url)} target="_blank" rel="noopener"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-crimson text-crimson font-extrabold py-2.5 text-[13px]">
                  {tab === "buy" ? "LG에서 보기" : "LG 구독 상담"} <ExternalLink size={15} />
                </a>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          ※ 표시가는 LG.com 기준 <b>참고 출고가 스냅샷</b>이며, 실제 판매가·재고·프로모션·구독료는 [LG에서 보기]에서 확인하세요. 추천은 진단 결과 기반 비교입니다.
        </p>
      </div>
    </div>
  );
}
