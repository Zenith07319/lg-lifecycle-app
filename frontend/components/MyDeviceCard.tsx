"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Snowflake, ChevronRight } from "lucide-react";
import { getLatestDevice, getDevices, type SavedDevice } from "@/lib/myDevice";
import { deviceImage, registrationRank } from "@/lib/deviceImage";
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
        <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
          <Snowflake size={26} className="text-accent" strokeWidth={2.2} />
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
  // 내 가전 카드와 동일한 폼팩터별 캐릭터 이미지 차용(같은 기기 = 같은 컷). 등급은 작은 칩으로 유지.
  const img = deviceImage(dev.form, registrationRank(getDevices(), dev.sessionId));
  const name = `${dev.form ? dev.form + " " : ""}${dev.product_type}`;
  return (
    <Link href={`/result/${dev.sessionId}`} className="block rounded-[22px] bg-surface border border-line p-4 shadow-[var(--shadow-pop)] flex items-center gap-4 active:scale-[.99] transition-transform">
      <div className="relative size-[68px] shrink-0 overflow-hidden rounded-2xl bg-[#EDF0F1] flex items-center justify-center">
        <img src={img} alt="" className="size-[60px] object-contain" />
        <span className="absolute bottom-1 right-1 flex size-[19px] items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-[0_1px_3px_rgba(0,0,0,.25)]" style={{ background: color }}>{dev.grade}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-muted">내 에어컨</p>
        <p className="text-[15px] font-bold text-ink truncate">{name} ({dev.purchase_year})</p>
        <p className="text-[12px] text-muted truncate">{dev.capacity_kw}kW · 건강점수 {dev.score.toFixed(0)} · {dev.recommendation}</p>
      </div>
      <ChevronRight size={18} className="text-muted shrink-0" />
    </Link>
  );
}
