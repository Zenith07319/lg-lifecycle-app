"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Bell, BookOpen, MapPin, Info, LayoutGrid } from "lucide-react";
import { allAlerts } from "@/lib/alerts";

const ITEMS = [
  { href: "/notifications", icon: Bell, label: "알림", desc: "부품 보유기간·관리 시점", badge: true },
  { href: "/devices", icon: LayoutGrid, label: "내 가전", desc: "등록한 에어컨 관리" },
  { href: "/guide", icon: BookOpen, label: "관리 가이드", desc: "셀프 관리로 전기료·냄새↓" },
  { href: "/centers", icon: MapPin, label: "서비스센터", desc: "주변 LG 센터·방문 예약" },
];

export default function MorePage() {
  const [cnt, setCnt] = useState(0);
  useEffect(() => {
    const sync = () => setCnt(allAlerts().length);
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">더보기</h1>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-[20px] bg-surface border border-line shadow-[var(--shadow-card)] divide-y divide-line/70 overflow-hidden">
          {ITEMS.map(({ href, icon: Icon, label, desc, badge }) => (
            <Link key={href} href={href} className="flex items-center gap-3.5 px-4 py-3.5 active:bg-[#faf5f2]">
              <div className="w-10 h-10 rounded-xl bg-[#f6f1ee] flex items-center justify-center shrink-0">
                <Icon size={19} className="text-crimson" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-bold text-ink">{label}</p>
                <p className="text-[11.5px] text-muted">{desc}</p>
              </div>
              {badge && cnt > 0 && (
                <span className="text-[10px] font-extrabold text-white bg-crimson rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">{cnt}</span>
              )}
              <ChevronRight size={16} className="text-muted shrink-0" />
            </Link>
          ))}
        </div>

        <div className="rounded-[18px] bg-[#faf5f2] border border-line p-4 mt-4 flex gap-3">
          <Info size={18} className="text-crimson shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-bold text-ink">ROR — Replace or Repair Check</p>
            <p className="text-[11.5px] text-muted leading-relaxed mt-0.5">LG ThinQ 내 가정용 에어컨 의사결정 지원 · 모든 수치는 입력 조건 기준 추정이며 정확한 고장 예측이 아닙니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
