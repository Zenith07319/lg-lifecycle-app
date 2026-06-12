"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/ui";
import { allAlerts, type DeviceAlert } from "@/lib/alerts";

/* 07-1 알림 — Figma: 큰 제목 + 알림 카드(아이콘·제목·본문·메타) · warn 강조 · 빈 상태 */
export default function NotificationsPage() {
  const router = useRouter();
  const [list, setList] = useState<DeviceAlert[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setList(allAlerts()); setReady(true); };
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  return (
    <div className="pb-28">
      <AppHeader
        title="알림"
        subtitle="진단 결과 · 케어 시기 · 혜택 소식"
        right={ready && list.length > 0
          ? <span className="rounded-xl bg-accent-soft px-3 py-2 text-[12px] font-bold text-accent shadow-[0_2px_8px_rgba(5,31,31,.06)]">전체 {list.length}건</span>
          : undefined}
      />

      <div className="px-6 pt-3">
        {ready && list.length === 0 ? (
          /* 빈 상태 */
          <div className="reveal reveal-1 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-[20px] bg-surface-sunken">
              <BellOff size={28} className="text-muted" strokeWidth={2} />
            </div>
            <p className="text-[15px] font-extrabold text-ink">새 알림이 없어요</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              가전을 등록하면 부품 보유기간·관리 시점을<br />맞춰 알려드려요.
            </p>
            <Link href="/diagnose"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_4px_14px_rgba(4,125,134,.32)] active:scale-[.99] transition">
              에어컨 진단하기
            </Link>
          </div>
        ) : (
          <>
            <div className="reveal reveal-1 space-y-2.5">
              {list.map((a) => {
                const warn = a.level === "warn";
                return (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/result/${a.device.sessionId}`)}
                    className={`flex w-full gap-3.5 rounded-[16px] px-4 py-4 text-left shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm transition active:scale-[.99] ${
                      warn ? "border border-[#F1E3BC] bg-[#FDF3DF]" : "bg-white/64"
                    }`}
                  >
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-[13px] text-[20px] leading-none ${
                      warn ? "bg-white/70" : "bg-accent-soft"
                    }`}>
                      {a.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-extrabold text-ink">{a.title}</span>
                        {warn && (
                          <span className="rounded-full bg-warning px-1.5 py-0.5 text-[9.5px] font-extrabold text-white">중요</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{a.body}</p>
                      <p className="mt-1.5 text-[10.5px] text-muted">
                        {a.device.product_type}({a.device.purchase_year}) · 결과 보기 →
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 self-center text-ink-300" />
                  </button>
                );
              })}
            </div>

            <Link href="/guide"
              className="mt-2.5 flex items-center justify-center gap-1 rounded-[16px] bg-white/60 py-3.5 text-[13px] font-bold text-ink-soft shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm active:scale-[.99] transition">
              🌬 에어컨 관리 가이드 보기
            </Link>

            <p className="px-1 pt-4 text-center text-[10px] leading-relaxed text-muted">
              알림을 누르면 진단 결과 화면으로 이동해요
            </p>
          </>
        )}
      </div>
    </div>
  );
}
