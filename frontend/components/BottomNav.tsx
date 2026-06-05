"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Stethoscope, LayoutGrid, Menu } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/diagnose", label: "진단", icon: Stethoscope },
  { href: "/devices", label: "내 가전", icon: LayoutGrid },
];
const SOON = [
  { label: "더보기", icon: Menu },
];

export default function BottomNav() {
  const path = usePathname();
  const isResult = path?.startsWith("/result");
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-30 px-3 pb-3">
      <div className="rounded-[22px] bg-surface/85 backdrop-blur-md border border-line shadow-[var(--shadow-pop)] flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? path === "/"
              : path?.startsWith(href) || (href === "/diagnose" && isResult);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                active ? "text-crimson" : "text-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              {label}
            </Link>
          );
        })}
        {SOON.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => alert(`${label}는 준비 중입니다. (3단계 기능)`)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-muted/60"
          >
            <Icon size={20} strokeWidth={1.9} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
