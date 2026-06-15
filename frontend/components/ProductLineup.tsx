"use client";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { NewModel } from "@/lib/types";

/* 신형 라인업 카드 — 설문 Q11(신형 비교)과 추천 제품(구매/구독) 화면이 공유.
   variant: onSelect 있으면 '선택형'(Q11), 없으면 '브라우즈형'(추천제품).
   priceMode: both(판매가+구독칩) / buy(판매가만) / sub(구독료만). cta: 외부 LG 링크 버튼. */

export function gradeCls(g: string) {
  if (g.startsWith("1")) return "bg-[#e7f4ec] text-[#1a6b3d]";
  if (g.startsWith("2")) return "bg-[#eaf6ef] text-[#2f8f55]";
  if (g.startsWith("3")) return "bg-[#fff3da] text-[#a9730a]";
  return "bg-[#f1f1f3] text-[#6b7178]";
}
export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const withUtm = (u: string) => u + (u.includes("?") ? "&" : "?") + "utm_source=ROR&utm_medium=recommend";

export function NewModelCard({ m, capacity, recommended, selected, onSelect, expanded, onToggleExpand, priceMode = "both", cta }: {
  m: NewModel; capacity: number; recommended?: boolean;
  selected?: boolean; onSelect?: (code: string) => void;
  expanded: boolean; onToggleExpand: (code: string) => void;
  priceMode?: "both" | "buy" | "sub"; cta?: "buy" | "sub";
}) {
  const [imgErr, setImgErr] = useState(false);
  const big = m.capacity_kw > capacity * 1.5;
  const tall = m.form === "스탠드";
  const clickable = !!onSelect;
  return (
    <div onClick={clickable ? () => onSelect!(m.model_code) : undefined}
      className={`relative rounded-[18px] p-3 shadow-[var(--shadow-card)] transition ${clickable ? "cursor-pointer active:scale-[.99]" : ""} ${selected ? "border-2 border-accent bg-white" : "border border-line bg-white/80"}`}>
      {selected && <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-accent text-white"><Check size={13} /></div>}
      <div className="flex gap-3">
        <div className="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e7e8e2] bg-white">
          {m.image && !imgErr
            ? <img src={m.image} alt={m.line} loading="lazy" onError={() => setImgErr(true)} className="size-full object-cover" />
            : tall
              ? <div className="relative h-[70px] w-6 rounded-lg border border-[#dcdfd8] bg-gradient-to-b from-[#fbfbf8] to-[#e8e9e3]"><span className="absolute left-1/2 top-2 size-2 -translate-x-1/2 rounded-full bg-[#7a847f]" /></div>
              : <div className="h-6 w-14 rounded-lg border border-[#dcdfd8] bg-gradient-to-b from-white to-[#eceee9]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {m.grade
              ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${gradeCls(m.grade)}`}>효율 {m.grade}</span>
              : <span className="rounded-full bg-[#f1f1f3] px-1.5 py-0.5 text-[10px] font-extrabold text-[#6b7178]">등급 미표기</span>}
            {recommended && <span className="rounded-full bg-green-050 px-1.5 py-0.5 text-[10px] font-extrabold text-success">내 방에 맞음</span>}
          </div>
          <p className="mt-1 text-[13.5px] font-extrabold leading-tight text-ink">{m.line}</p>
          <p className="text-[10px] font-semibold text-ink-300">{m.product_type_raw} · {m.model_code}</p>
          <p className="mt-1 text-[11.5px] font-semibold text-ink-soft">냉방 {m.pyeong}평{m.cooling_area_m2 ? `(${m.cooling_area_m2}㎡)` : ""} · {m.capacity_kw}kW · 월 {m.monthly_kwh}kWh</p>
          {priceMode === "sub" ? (
            <div className="mt-1">
              {m.sub_fee > 0
                ? <><span className="text-[14.5px] font-black text-accent">월 {m.sub_fee.toLocaleString("ko-KR")}원</span><span className="ml-1.5 text-[10px] font-semibold text-ink-300">구독</span></>
                : <span className="text-[12px] font-bold text-muted">구독 미제공 · LG 상담</span>}
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="text-[11px] text-ink-300 line-through">{won(m.list_price)}</span>
              <span className="text-[14.5px] font-black text-ink">{won(m.sale_price)}</span>
              {priceMode === "both" && m.sub_fee > 0 && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent">구독 월 {m.sub_fee.toLocaleString("ko-KR")}원</span>}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.features.slice(0, 3).map((f) => <span key={f.name} className="rounded-full border border-line bg-sunken px-2 py-0.5 text-[10px] font-bold text-ink-soft">{f.name}</span>)}
          </div>
        </div>
      </div>
      {big && <p className="mt-2 rounded-lg bg-[#FFF6E6] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#9a6a00]">⚠️ 내 방({capacity}kW)보다 큰 용량이에요. 신형이 전기를 더 쓸 수 있어요.</p>}
      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(m.model_code); }}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-1.5 text-[11.5px] font-extrabold text-accent">
        {expanded ? "접기 ▲" : "기능·스펙 자세히 ▾"}
      </button>
      {expanded && (
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
      {cta && m.product_url && (
        <a href={withUtm(m.product_url)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-accent py-2.5 text-[12.5px] font-extrabold text-accent active:scale-[.99] transition">
          {cta === "buy" ? "LG에서 보기" : "LG 구독 상담"} <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
