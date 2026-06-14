import Link from "next/link";
import { Bell, Zap, Leaf, ShieldCheck, Scale, SlidersHorizontal } from "lucide-react";
import MyDeviceCard from "@/components/MyDeviceCard";
import NotificationBadge from "@/components/NotificationBadge";

const STEPS = [
  { icon: Zap, title: "전기요금", desc: "월간 소비전력량 기반 · 누진 구간 영향 포함", tone: "teal" },
  { icon: Leaf, title: "탄소 영향", desc: "LG ESG 단계별 비율 · 교체 회수기간", tone: "green" },
  { icon: ShieldCheck, title: "점검 필요도", desc: "증상 · 연식 · 관리 · VOC 종합", tone: "teal" },
  { icon: Scale, title: "5가지 비교", desc: "계속 · 셀프케어 · 수리 · 구독 · 교체 점수화", tone: "green" },
] as const;

export default function HomePage() {
  return (
    <div className="pb-4">
      {/* 헤더 */}
      <header className="px-6 pt-5">
        <h1 className="text-[26px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>Home</h1>
        <p className="mt-1 text-[12px] font-medium text-muted">LG ThinQ · 가정용 에어컨</p>
      </header>

      <div className="space-y-4 px-5 pt-4">
        {/* 내 가전 */}
        <div className="reveal reveal-1"><MyDeviceCard /></div>

        {/* 알림 + 지금 진단하기 */}
        <div className="reveal reveal-2 grid grid-cols-2 gap-3">
          <Link href="/notifications" className="glass relative flex flex-col justify-between rounded-[18px] p-4 shadow-[var(--shadow-card)] active:scale-[.99] transition">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft">
              <Bell size={18} className="text-accent" strokeWidth={2} />
              <NotificationBadge />
            </div>
            <div className="mt-3">
              <p className="text-[13.5px] font-bold text-ink">알림</p>
              <p className="text-[10.5px] text-muted">진단 결과 · 케어 시기 · 혜택</p>
            </div>
          </Link>

          <Link href="/diagnose" className="relative flex flex-col justify-between overflow-hidden rounded-[18px] p-4 shadow-[var(--shadow-card)] active:scale-[.99] transition"
            style={{ background: "linear-gradient(180deg, rgba(145,223,107,.42) 0%, rgba(255,255,255,.55) 100%)" }}>
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/70">
              <SlidersHorizontal size={18} className="text-ink-soft" strokeWidth={2} />
            </div>
            <div className="mt-3">
              <p className="text-[14px] font-extrabold text-ink">지금 진단하기</p>
              <p className="text-[10px] leading-snug text-ink-soft">증상 입력 → 건강등급 · 5가지 비교</p>
            </div>
          </Link>
        </div>

        {/* Smart Check Points */}
        <section className="reveal reveal-3">
          <h2 className="mb-2 px-1 text-[13px] font-extrabold text-ink">Smart Check Points</h2>
          <div className="glass overflow-hidden rounded-[18px] shadow-[var(--shadow-card)]">
            {STEPS.map(({ icon: Icon, title, desc, tone }, i) => (
              <div key={title} className={`flex items-center gap-3.5 px-4 py-3.5 ${i < STEPS.length - 1 ? "border-b border-line/60" : ""}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone === "teal" ? "bg-accent-soft" : "bg-green-050"}`}>
                  <Icon size={19} className={tone === "teal" ? "text-accent" : "text-success"} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{title}</p>
                  <p className="text-[11px] leading-snug text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="px-1 pt-1 text-center text-[10px] leading-relaxed text-muted">
          MVP 대상 = 에어컨 · 모든 수치는 현재 입력 조건 기준 <b>추정</b>이며, 정확한 고장 예측이 아닙니다.
        </p>
      </div>
    </div>
  );
}
