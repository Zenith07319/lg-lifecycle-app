"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { allAlerts, type DeviceAlert } from "@/lib/alerts";

export default function AlertBanner() {
  const [top, setTop] = useState<DeviceAlert | null>(null);
  const [cnt, setCnt] = useState(0);
  useEffect(() => {
    const sync = () => { const a = allAlerts(); setTop(a[0] ?? null); setCnt(a.length); };
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  if (!top) return null;
  return (
    <Link href="/notifications" className="block rounded-[18px] bg-[#fff6f0] border border-[#f3d9c8] px-4 py-3 flex items-center gap-3 active:scale-[.99] transition-transform">
      <div className="relative">
        <Bell size={20} className="text-crimson" strokeWidth={2.2} />
        {cnt > 1 && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-extrabold text-white bg-crimson rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{cnt}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-extrabold text-ink truncate">{top.icon} {top.title}</p>
        <p className="text-[11.5px] text-ink-soft truncate">{top.body}</p>
      </div>
      <ChevronRight size={16} className="text-muted shrink-0" />
    </Link>
  );
}
