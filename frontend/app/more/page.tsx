"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, BookOpen, MapPin, FileClock, Settings, Info, ChevronRight,
} from "lucide-react";
import { AppHeader } from "@/components/ui";
import { allAlerts } from "@/lib/alerts";
import { getDevices, getLatestDevice, type SavedDevice } from "@/lib/myDevice";

/* 06-1 더보기 — Figma: 인사 카드 + 내 메뉴(알림·가이드·센터) + 기타(기록·설정·버전) */
export default function MorePage() {
  const [cnt, setCnt] = useState(0);
  const [devs, setDevs] = useState<SavedDevice[]>([]);
  const [latest, setLatest] = useState<SavedDevice | null>(null);
  useEffect(() => {
    const sync = () => { setCnt(allAlerts().length); setDevs(getDevices()); setLatest(getLatestDevice()); };
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  const ago = (ms?: number) => {
    if (!ms) return "—";
    const d = Math.floor((Date.now() - ms) / 86400000);
    return d <= 0 ? "오늘" : d === 1 ? "어제" : `${d}일 전`;
  };

  const menu = [
    { href: "/notifications", icon: Bell, label: "알림", desc: "진단 결과 · 케어 시기 · 혜택 소식", iconBg: "bg-accent-soft", iconColor: "text-accent", badge: cnt },
    { href: "/guide", icon: BookOpen, label: "관리 가이드", desc: "에어컨 셀프케어 · 시즌 점검 체크리스트", iconBg: "bg-green-050", iconColor: "text-success" },
    { href: "/centers", icon: MapPin, label: "서비스센터", desc: "주변 센터 찾기 · 방문 예약 · 상담", iconBg: "bg-[#FDF3DF]", iconColor: "text-warning" },
  ];

  const etc = [
    { href: "/devices", icon: FileClock, label: "진단 기록" },
    { href: "/diagnose", icon: Settings, label: "새 진단 시작" },
  ];

  return (
    <div className="pb-28">
      <AppHeader title="더보기" subtitle="알림과 관리도구를 한 곳에서" />

      <div className="px-6 pt-3">
        {/* 인사 카드 (그린 그라데이션) */}
        <div className="reveal reveal-1 flex items-center gap-3.5 rounded-[18px] px-4 pb-3.5 pt-4 shadow-[0_2px_8px_rgba(5,31,31,.06)]"
          style={{ background: "linear-gradient(180deg, rgba(145,223,107,.41) 0%, rgba(255,255,255,.51) 100%)" }}>
          <div className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/75">
            <img src="/character-head.png" alt="" className="size-11 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold leading-tight text-ink">안녕하세요, 오늘도 좋은 하루예요</p>
            <p className="mt-1 text-[11px] font-medium text-ink-soft">
              {devs.length > 0 ? `등록 가전 ${devs.length}대 · 최근 진단 ${ago(latest?.savedAt)}` : "아직 등록된 가전이 없어요 · 진단으로 시작하기"}
            </p>
          </div>
        </div>

        {/* 내 메뉴 */}
        <p className="reveal reveal-2 mb-2.5 mt-5 px-1 text-[13px] font-bold text-muted">내 메뉴</p>
        <div className="reveal reveal-2 space-y-2.5">
          {menu.map(({ href, icon: Icon, label, desc, iconBg, iconColor, badge }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3.5 rounded-[16px] bg-white/64 px-4 py-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm active:scale-[.99] transition">
              <div className={`relative flex size-11 shrink-0 items-center justify-center rounded-[13px] ${iconBg}`}>
                <Icon size={21} className={iconColor} strokeWidth={2} />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex min-w-[19px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">{badge}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-ink">{label}</p>
                <p className="text-[11px] text-muted">{desc}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-300" />
            </Link>
          ))}
        </div>

        {/* 기타 */}
        <p className="mb-2.5 mt-5 px-1 text-[13px] font-bold text-muted">기타</p>
        <div className="overflow-hidden rounded-[16px] bg-white/60 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
          {etc.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex items-center gap-3.5 border-b border-line/70 px-4 py-3.5 last:border-0 active:bg-accent-soft">
              <Icon size={19} className="shrink-0 text-ink-500" strokeWidth={2} />
              <span className="flex-1 text-[13.5px] font-semibold text-ink">{label}</span>
              <ChevronRight size={16} className="text-ink-300" />
            </Link>
          ))}
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <Info size={19} className="shrink-0 text-ink-500" strokeWidth={2} />
            <span className="flex-1 text-[13.5px] font-semibold text-ink">버전 정보</span>
            <span className="text-[12px] font-medium text-muted">v2.4.1</span>
          </div>
        </div>

        <p className="px-1 pt-4 text-center text-[10px] leading-relaxed text-muted">
          ROR — Replace or Repair Check · LG ThinQ 내 가정용 에어컨 의사결정 지원<br />
          모든 수치는 입력 조건 기준 추정이며 정확한 고장 예측이 아닙니다.
        </p>
      </div>
    </div>
  );
}
