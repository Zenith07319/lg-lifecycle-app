import Link from "next/link";
import { ArrowRight, Snowflake, Zap, Leaf, ScanSearch, Scale } from "lucide-react";
import MyDeviceCard from "@/components/MyDeviceCard";

const STEPS = [
  { icon: Zap, title: "전기요금", desc: "월간 소비전력량 기반 · 누진 구간 영향 포함" },
  { icon: Leaf, title: "탄소 영향", desc: "LG ESG 단계별 비율 · 교체 회수기간" },
  { icon: ScanSearch, title: "점검 필요도", desc: "증상·연식·관리·VOC 종합 (고장예측 아님)" },
  { icon: Scale, title: "5가지 비교", desc: "계속·셀프케어·수리·구독·신제품 점수화" },
];

const GRADES = [
  { g: "A", c: "var(--color-grade-a)", d: "양호" },
  { g: "B", c: "var(--color-grade-b)", d: "관리" },
  { g: "C", c: "var(--color-grade-c)", d: "점검" },
  { g: "D", c: "var(--color-grade-d)", d: "검토" },
  { g: "E", c: "var(--color-grade-e)", d: "교체" },
];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <header
        className="relative px-6 pt-12 pb-14 text-white overflow-hidden"
        style={{ background: "linear-gradient(158deg,#bb0040 0%,#a50034 40%,#6c0021 100%)" }}
      >
        <Snowflake
          className="absolute -right-6 -top-6 opacity-15"
          size={150}
          strokeWidth={1}
        />
        <p className="text-[12px] font-semibold tracking-wide text-white/85">
          LG ThinQ · 가정용 에어컨
        </p>
        <h1
          className="mt-1 text-[52px] leading-none font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ROR
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/90">
          우리 집 에어컨, <b className="font-bold">계속 쓸까 · 고칠까 · 바꿀까?</b>
          <br />
          데이터로 비교해 결정해 드려요.
        </p>
      </header>

      {/* ── 내 에어컨 (히어로에 겹침) ── */}
      <div className="px-5 -mt-8 relative z-10 reveal reveal-1">
        <MyDeviceCard />
      </div>

      {/* ── CTA ── */}
      <div className="px-5 mt-4 reveal reveal-2">
        <Link
          href="/diagnose"
          className="group flex items-center gap-4 rounded-[20px] px-5 py-4 text-white shadow-[0_10px_24px_rgba(165,0,52,.28)] active:scale-[.99] transition-transform"
          style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}
        >
          <span className="text-[26px]">🩺</span>
          <span className="flex-1">
            <span className="block text-[16px] font-extrabold">지금 진단하기</span>
            <span className="block text-[11.5px] text-white/85">
              증상 입력 → 건강등급 · 5선택지 비교
            </span>
          </span>
          <ArrowRight size={20} className="text-white/90 group-active:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── 이렇게 비교해 드려요 ── */}
      <section className="px-5 mt-8 reveal reveal-3">
        <h2 className="text-[13px] font-extrabold text-ink mb-3 px-1">이렇게 비교해 드려요</h2>
        <div className="space-y-2.5">
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3.5 rounded-[18px] bg-surface border border-line p-3.5 shadow-[var(--shadow-card)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f6f1ee] flex items-center justify-center shrink-0">
                <Icon size={19} className="text-crimson" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-ink">{title}</p>
                <p className="text-[11.5px] text-muted leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 건강등급 ── */}
      <section className="px-5 mt-8 reveal reveal-4">
        <h2 className="text-[13px] font-extrabold text-ink mb-3 px-1">건강등급 A~E</h2>
        <div className="grid grid-cols-5 gap-2">
          {GRADES.map(({ g, c, d }) => (
            <div
              key={g}
              className="rounded-2xl bg-surface border border-line py-3 text-center shadow-[var(--shadow-card)]"
            >
              <div
                className="text-[26px] font-extrabold leading-none"
                style={{ fontFamily: "var(--font-display)", color: c }}
              >
                {g}
              </div>
              <div className="text-[10.5px] text-muted mt-1">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="px-6 mt-8 text-[11px] leading-relaxed text-muted text-center">
        MVP 대상 = 에어컨 · 모든 수치는 현재 입력 조건 기준 <b>추정</b>이며,
        정확한 고장 예측이 아닙니다.
      </p>
    </div>
  );
}
