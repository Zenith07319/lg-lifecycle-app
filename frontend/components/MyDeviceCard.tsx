"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Snowflake, ChevronRight } from "lucide-react";
import { getLatestDevice, type SavedDevice } from "@/lib/myDevice";
import { GRADE_COLORS } from "@/lib/utils";

export default function MyDeviceCard() {
  const [dev, setDev] = useState<SavedDevice | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setDev(getLatestDevice()); setReady(true); };
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  // 미진단(또는 SSR 직후) — 등록 유도
  if (!ready || !dev) {
    return (
      <Link href={ready ? "/diagnose" : "#"} className="block rounded-[22px] bg-surface border border-line p-4 shadow-[var(--shadow-pop)] flex items-center gap-4 active:scale-[.99] transition-transform">
        <div className="w-14 h-14 rounded-2xl bg-[#fdeef4] flex items-center justify-center shrink-0">
          <Snowflake size={26} className="text-crimson" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-muted">내 에어컨</p>
          <p className="text-[15px] font-bold text-ink">아직 등록 전이에요</p>
          <p className="text-[12px] text-muted">진단하면 자동으로 등록돼요</p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#f0ece9] text-ink-soft whitespace-nowrap">진단 전</span>
      </Link>
    );
  }

  const color = GRADE_COLORS[dev.grade] ?? "#a50034";
  return (
    <Link href={`/result/${dev.sessionId}`} className="block rounded-[22px] bg-surface border border-line p-4 shadow-[var(--shadow-pop)] flex items-center gap-4 active:scale-[.99] transition-transform">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
        <span className="text-[22px] font-extrabold" style={{ fontFamily: "var(--font-display)", color }}>{dev.grade}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-muted">내 에어컨</p>
        <p className="text-[15px] font-bold text-ink truncate">{dev.product_type} ({dev.purchase_year})</p>
        <p className="text-[12px] text-muted">{dev.capacity_kw}kW · 건강점수 {dev.score.toFixed(0)} · {dev.recommendation}</p>
      </div>
      <ChevronRight size={18} className="text-muted shrink-0" />
    </Link>
  );
}
