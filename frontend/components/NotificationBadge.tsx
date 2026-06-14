"use client";
import { useEffect, useState } from "react";
import { allAlerts } from "@/lib/alerts";

/* 홈 '알림' 카드의 미확인 개수 배지 — 실제 알림 수에 연동(삭제 시 감소, 0이면 숨김). */
export default function NotificationBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(allAlerts().length);
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);
  if (n <= 0) return null;
  return (
    <span className="absolute left-[42px] top-3 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">{n}</span>
  );
}
