"use client";
import { useEffect, useState } from "react";

/* 앱 시작 화면(브랜드 스플래시) — 콜드 오픈 시 1회.
   #ECEDED + 블러 블롭 배경 / "Welcome · ROR" 워드마크 / 캐릭터 둥실 등장 + 볼·귀 번개 스파크.
   ~2초 후 페이드아웃, 탭하면 스킵, prefers-reduced-motion 존중, 안전 타임아웃 포함. */

// Figma 시작화면 블롭(390×844 절대좌표 그대로 — 장식)
const BLOBS = [
  { w: 183, h: 183, l: -1, t: 292, bg: "rgba(66,173,181,0.60)", blur: 90 },
  { w: 247, h: 305, l: 160, t: 475, bg: "rgba(66,173,181,0.60)", blur: 90 },
  { w: 209, h: 262, l: 191, t: 753, bg: "#B7DDA5", blur: 90 },
  { w: 290, h: 287, l: 182, t: 188, bg: "rgba(139,210,104,0.30)", blur: 43.85 },
  { w: 200, h: 210, l: 10, t: 604, bg: "#BEE5AB", blur: 90 },
];
// 캐릭터 머리(볼·귀) 주변 번개 스파크 위치(캐릭터 래퍼 220px 기준)
const SPARKS = [
  { l: 30, t: 64, s: 24, d: 0.0 },   // 왼쪽 볼
  { l: 168, t: 60, s: 26, d: 0.5 },  // 오른쪽 볼
  { l: 58, t: 2, s: 19, d: 0.9 },    // 왼쪽 귀끝
  { l: 138, t: -2, s: 19, d: 1.3 },  // 오른쪽 귀끝
  { l: 104, t: 44, s: 16, d: 0.7 },  // 중앙
];

function Spark({ l, t, s, d }: { l: number; t: number; s: number; d: number }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden
      style={{
        position: "absolute", left: l, top: t,
        filter: "drop-shadow(0 0 6px rgba(255,210,63,.9))",
        animation: `splashSpark 1.4s ease-in-out ${d}s infinite`,
      }}>
      <path d="M13 2 L4 14 H11 L9 22 L20 9 H13 Z" fill="#FFD23F" stroke="#FFB800" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export default function Splash() {
  const [closing, setClosing] = useState(false);
  const [gone, setGone] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const r = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReduce(r);
    document.body.style.overflow = "hidden";
    const hold = r ? 700 : 2100;
    const t1 = setTimeout(() => setClosing(true), hold);
    const t2 = setTimeout(() => { setGone(true); document.body.style.overflow = ""; }, hold + 460);
    return () => { clearTimeout(t1); clearTimeout(t2); document.body.style.overflow = ""; };
  }, []);

  const skip = () => {
    setClosing(true);
    setTimeout(() => { setGone(true); document.body.style.overflow = ""; }, 360);
  };

  if (gone) return null;
  const rise = (delay: string) => (reduce ? {} : { animation: `splashRise .6s ease-out ${delay} both` });

  return (
    <div onClick={skip} role="status" aria-label="ROR 시작 화면"
      className={`fixed inset-0 z-[100] transition-opacity duration-[460ms] ${closing ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ background: "#ECEDED" }}>
      <div className="relative mx-auto h-full w-full max-w-[440px] overflow-hidden">
        {/* 블러 블롭 배경 */}
        {BLOBS.map((b, i) => (
          <div key={i} aria-hidden style={{
            position: "absolute", width: b.w, height: b.h, left: b.l, top: b.t,
            opacity: 0.5, background: b.bg, borderRadius: 9999, filter: `blur(${b.blur}px)`,
            animation: reduce ? undefined : `splashDrift ${7 + i}s ease-in-out ${i * 0.4}s infinite`,
          }} />
        ))}

        {/* 콘텐츠 */}
        <div className="relative flex h-full flex-col px-[34px]">
          <div className="pt-[31%]">
            <p style={{ fontSize: 48, fontWeight: 500, color: "rgba(0,0,0,0.5)", lineHeight: 1, ...rise(".15s") }}>Welcome</p>
            <p style={{ fontSize: 48, fontWeight: 500, color: "#000", lineHeight: 1.05, ...rise(".3s") }}>ROR</p>
            <p style={{
              marginTop: 18, fontSize: 16, fontWeight: 700, lineHeight: "23px",
              color: "rgba(51,54,63,0.7)", textShadow: "0px 4px 18px rgba(0,0,0,0.25)", ...rise(".45s"),
            }}>
              우리 집 가전, 계속 쓸까 · 고칠까 · 바꿀까?<br />데이터로 비교해드려요.
            </p>
          </div>

          {/* 캐릭터 + 번개 스파크 (하단 중앙) */}
          <div className="flex flex-1 items-center justify-center">
            <div className="relative" style={{ width: 220, height: 220 }}>
              <img src="/character.png" alt="" className="absolute inset-0 m-auto w-[200px] object-contain drop-shadow-[0_16px_28px_rgba(4,125,134,.22)]"
                style={{
                  animation: reduce
                    ? "splashRise .6s ease-out .2s both"
                    : "splashFloatIn .7s cubic-bezier(.2,.8,.2,1) both, splashBob 3.2s ease-in-out .8s infinite",
                }} />
              {!reduce && SPARKS.map((s, i) => <Spark key={i} {...s} />)}
            </div>
          </div>

          {/* 스킵 힌트 */}
          <p className="pb-7 text-center text-[11px] font-medium text-muted/70">탭하면 건너뛰기</p>
        </div>
      </div>
    </div>
  );
}
