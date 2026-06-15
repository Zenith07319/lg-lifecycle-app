"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader, LgBadge } from "@/components/ui";
import { getSession, getNewModels } from "@/lib/api";
import { NewModelCard } from "@/components/ProductLineup";
import type { SessionData, NewModel } from "@/lib/types";

/* 추천 제품 — 결정가이드의 '추천 신제품(구매)' / '구독 상품 보기(구독)'에서 진입.
   화면 구성은 설문 마지막 신형 비교(Q11)와 동일: 벽걸이/스탠드 탭 + 공용 라인업 카드.
   mode(buy/sub)로 가격 표시·CTA만 분리. */
function ProductsInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sp = useSearchParams();
  const mode: "buy" | "sub" = sp.get("mode") === "sub" ? "sub" : "buy";

  const [data, setData] = useState<SessionData | null>(null);
  const [models, setModels] = useState<NewModel[]>([]);
  const [tab, setTab] = useState<"벽걸이" | "스탠드" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { if (sessionId) getSession(sessionId).then(setData).catch(() => {}); }, [sessionId]);
  useEffect(() => { getNewModels().then((r) => setModels(r.items)).catch(() => {}); }, []);

  const cap = (data?.user_inputs.capacity_kw as number) ?? 3.6;
  const userForm: "벽걸이" | "스탠드" = cap >= 5.5 ? "스탠드" : "벽걸이";
  const activeTab = tab ?? userForm;

  // 구독 탭은 구독 제공 모델만(구독료 0 제외)
  const pool = mode === "sub" ? models.filter((m) => m.sub_fee > 0) : models;
  const counts = { 벽걸이: pool.filter((m) => m.form === "벽걸이").length, 스탠드: pool.filter((m) => m.form === "스탠드").length };
  const nearest = [...pool].filter((m) => m.form === userForm)
    .sort((a, b) => Math.abs(a.capacity_kw - cap) - Math.abs(b.capacity_kw - cap))[0];
  const list = pool.filter((m) => m.form === activeTab).sort((a, b) => {
    if (nearest && a.model_code === nearest.model_code) return -1;
    if (nearest && b.model_code === nearest.model_code) return 1;
    return a.capacity_kw - b.capacity_kw;
  });

  const title = mode === "sub" ? "구독 상품" : "추천 신제품";
  const subtitle = mode === "sub" ? "케어십 포함 · 초기비용 0원 구독" : "교체 경로 · LG 1등급 신형";

  return (
    <div className="pb-28">
      <div className="px-6 pt-4">
        <Link href={`/result/${sessionId}/guide`} className="-ml-1 flex items-center text-ink-soft" aria-label="뒤로">
          <ChevronLeft size={24} />
        </Link>
      </div>
      <AppHeader title={title} subtitle={subtitle} right={<LgBadge />} />

      <div className="space-y-2.5 px-6 pt-3">
        {/* 내 용량 안내 */}
        <p className="px-1 text-[11px] text-muted">내 에어컨 <b className="text-ink-soft">{cap}kW</b> 기준 · 용량에 맞는 모델을 <b className="text-accent">내 방에 맞음</b>으로 표시</p>

        {/* 벽걸이 / 스탠드 탭 (Q11 동일) */}
        <div className="flex gap-1.5 rounded-2xl border border-line bg-white/70 p-1.5">
          {(["벽걸이", "스탠드"] as const).map((f) => (
            <button key={f} onClick={() => { setTab(f); setExpanded(null); }}
              className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-extrabold transition ${activeTab === f ? "bg-accent text-white shadow-[0_4px_12px_rgba(4,125,134,.28)]" : "text-ink-soft"}`}>
              {f} <span className={activeTab === f ? "text-white/75" : "text-ink-300"}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {models.length === 0 ? (
          <p className="py-16 text-center text-[12px] text-muted">제품을 불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-[12px] text-muted">해당 형태의 {mode === "sub" ? "구독 상품" : "제품"}을 준비 중이에요.</p>
        ) : (
          list.map((m) => (
            <NewModelCard key={m.model_code} m={m} capacity={cap}
              recommended={!!nearest && m.model_code === nearest.model_code}
              expanded={expanded === m.model_code}
              onToggleExpand={(code) => setExpanded((p) => (p === code ? null : code))}
              priceMode={mode} cta={mode} />
          ))
        )}

        <p className="px-1 pt-2 text-[10px] leading-relaxed text-muted">
          ※ 가격·구독료는 LG.com 기준 참고값이며, 실제 가격·재고·프로모션은 [{mode === "sub" ? "LG 구독 상담" : "LG에서 보기"}]에서 확인하세요.
        </p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-32 text-center text-muted">불러오는 중…</div>}>
      <ProductsInner />
    </Suspense>
  );
}
