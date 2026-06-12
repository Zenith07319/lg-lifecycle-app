"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/* ── 유리 카드 (Figma glass) ── */
export function GlassCard({
  className = "", children, style,
}: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className={`glass rounded-[18px] shadow-[var(--shadow-glass)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── 페이지 헤더 (큰 제목 + 부제, 옵션 백버튼) ── */
export function AppHeader({
  title, subtitle, back, right,
}: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="px-6 pt-4 pb-1">
      {back && (
        <button onClick={() => router.back()} className="mb-1 -ml-1 flex items-center text-ink-soft" aria-label="뒤로">
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[12px] font-medium text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

/* ── LG 연계 뱃지 ── */
export function LgBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-lg-red px-2 py-[3px] text-[9px] font-semibold text-lg-red">
      <span className="size-[5px] rounded-full bg-lg-red" /> LG 연계
    </span>
  );
}

/* ── 탄소 뱃지 (나무 N그루) ── */
export function CarbonBadge({ trees, tco2 }: { trees: number; tco2: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-green-050 px-2.5 py-1 text-[10px]">
      <span className="font-bold text-success">나무 {trees}그루 효과</span>
      <span className="h-[9px] w-px bg-green-200" />
      <span className="font-bold text-ink-500">{tco2.toFixed(1)}tCO₂</span>
    </span>
  );
}

/* ── 1차 CTA 버튼 (틸 채움) ── */
export function PrimaryButton({
  children, href, onClick, icon,
}: { children: React.ReactNode; href?: string; onClick?: () => void; icon?: React.ReactNode }) {
  const cls =
    "flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(4,125,134,.32)] active:scale-[.99] transition";
  if (href) return <Link href={href} className={cls}>{icon}{children}</Link>;
  return <button onClick={onClick} className={cls}>{icon}{children}</button>;
}
