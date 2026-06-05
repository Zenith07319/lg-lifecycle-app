"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import { getCenters } from "@/lib/api";
import type { CentersResponse } from "@/lib/types";

export default function CentersPage() {
  const router = useRouter();
  const [data, setData] = useState<CentersResponse | null>(null);
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCenters(region)
      .then((r) => { if (alive) { setData(r); if (!region) setRegion(r.selected); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [region]);

  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="text-crimson"><ChevronLeft size={22} /></button>
        <h1 className="text-[16px] font-extrabold text-ink">주변 서비스센터</h1>
        <span className="ml-auto text-[11px] text-muted">LG 공식</span>
      </div>

      <div className="px-4 py-4">
        {/* 지역 선택 */}
        {data && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {data.regions.map((rg) => (
              <button key={rg} onClick={() => setRegion(rg)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${region === rg ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-ink-soft"}`}>{rg}</button>
            ))}
          </div>
        )}

        {/* 통합 안내 */}
        {data && (
          <a href={`tel:${data.tel}`} className="mt-2 flex items-center gap-2 rounded-xl bg-[#faf5f2] border border-line px-4 py-2.5 text-[12px] text-ink-soft">
            <Phone size={14} className="text-crimson" /> 통합 고객센터 <b className="text-ink">{data.tel}</b>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted"><Clock size={12} />{data.hours}</span>
          </a>
        )}

        {loading ? (
          <p className="text-center text-muted text-[13px] py-12"><Loader2 className="inline animate-spin mr-1" size={14} />불러오는 중…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-center text-muted text-[13px] py-12">해당 지역 센터 정보가 없어요.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            <p className="text-[11.5px] text-muted px-1">{data.selected} · {data.count}곳</p>
            {data.items.map((c) => (
              <div key={c.name + c.address} className="rounded-[18px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
                <h3 className="text-[14px] font-extrabold text-ink">{c.name}</h3>
                <p className="flex items-start gap-1 text-[12px] text-muted mt-1"><MapPin size={13} className="shrink-0 mt-0.5" />{c.address}</p>
                {c.repair && <p className="text-[11.5px] text-ink-soft mt-1">🔧 {c.repair}</p>}
                {c.note && <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1.5">ℹ {c.note}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <a href={`tel:${data.tel}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-line text-ink-soft font-bold py-2.5 text-[13px]">
                    <Phone size={14} />전화
                  </a>
                  <a href={data.reserve_url} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 rounded-xl text-white font-extrabold py-2.5 text-[13px]" style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
                    방문 예약
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          ※ LG전자 전국 서비스센터(2025 기준). 정확한 운영시간·휴무·예약은 LG전자 고객지원(1544-7777) 또는 LG.com에서 확인하세요.
        </p>
      </div>
    </div>
  );
}
