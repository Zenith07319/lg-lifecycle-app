"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, BellOff, ChevronRight } from "lucide-react";
import { allAlerts, type DeviceAlert } from "@/lib/alerts";

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
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-accent"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">알림</h1>
        {ready && list.length > 0 && <span className="ml-auto text-[11px] text-muted">{list.length}건</span>}
      </div>

      <div className="px-4 py-4">
        {ready && list.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-16 h-16 rounded-3xl bg-[#eef0f0] flex items-center justify-center mx-auto mb-4">
              <BellOff size={28} className="text-muted" />
            </div>
            <p className="text-[15px] font-extrabold text-ink">새 알림이 없어요</p>
            <p className="text-[12.5px] text-muted mt-1 leading-relaxed">가전을 등록하면 부품 보유기간·관리 시점을<br />맞춰 알려드려요.</p>
            <Link href="/diagnose" className="inline-block mt-5 rounded-2xl text-white font-extrabold px-5 py-3 text-[14px]" style={{ background: "linear-gradient(135deg,#047d86,#034349)" }}>
              에어컨 진단하기
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((a) => (
              <button key={a.id} onClick={() => router.push(`/result/${a.device.sessionId}`)}
                className={`w-full text-left rounded-[18px] border p-4 shadow-[var(--shadow-card)] flex gap-3 active:scale-[.99] transition-transform ${a.level === "warn" ? "bg-[#FDF3DF] border-[#F1E3BC]" : "bg-surface border-line"}`}>
                <span className="text-[20px] leading-none mt-0.5">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-extrabold text-ink">{a.title}</span>
                    {a.level === "warn" && <span className="text-[9.5px] font-extrabold text-white bg-accent rounded-full px-1.5 py-0.5">중요</span>}
                  </div>
                  <p className="text-[12px] text-ink-soft leading-relaxed mt-0.5">{a.body}</p>
                  <p className="text-[10.5px] text-muted mt-1.5">{a.device.product_type}({a.device.purchase_year}) · 결과 보기 →</p>
                </div>
                <ChevronRight size={16} className="text-muted shrink-0 self-center" />
              </button>
            ))}
            <Link href="/guide" className="flex items-center justify-center gap-1 rounded-2xl border border-line text-ink-soft font-bold py-3 text-[13px] mt-1">
              🌬 에어컨 관리 가이드 보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
