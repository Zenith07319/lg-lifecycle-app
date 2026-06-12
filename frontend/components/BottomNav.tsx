"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, SlidersHorizontal, LayoutGrid, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/diagnose", label: "진단", icon: SlidersHorizontal },
  { href: "/devices", label: "내 가전", icon: LayoutGrid },
  { href: "/more", label: "더보기", icon: MoreHorizontal },
];

export default function BottomNav() {
  const path = usePathname() || "/";
  // 진단 플로우(진단·결과)는 '진단' 탭 활성
  const isDiagFlow = path.startsWith("/diagnose") || path.startsWith("/result");
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-white shadow-[0_-4px_14px_rgba(0,0,0,.08)]">
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? path === "/" : href === "/diagnose" ? isDiagFlow : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-[3px] pb-2 pt-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-accent" : "text-ink-soft"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
