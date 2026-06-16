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
export default function Splash() {
  const [closing, setClosing] = useState(false);
  const [gone, setGone] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    // 이번 브라우저 세션에 이미 봤으면(새로고침·하드 내비 폴백·PWA 복귀 등) 즉시 스킵 → 처음 시작 때만 표시.
    // sessionStorage는 탭/세션 단위라, 앱을 완전히 새로 열 때(새 세션)만 다시 보인다.
    let seen = false;
    try { seen = sessionStorage.getItem("ror_splash_seen") === "1"; } catch {}
    if (seen) { setGone(true); return; }
    try { sessionStorage.setItem("ror_splash_seen", "1"); } catch {}

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

          {/* 캐릭터 — 방방 뛰기 (하단 중앙) */}
          <div className="flex flex-1 items-center justify-center">
            <div className="relative flex h-[270px] w-[240px] items-end justify-center">
              {!reduce && (
                <div aria-hidden className="absolute bottom-[16px]"
                  style={{ width: 118, height: 16, background: "rgba(4,125,134,.45)", borderRadius: 9999, filter: "blur(7px)", animation: "splashShadow .85s ease-in-out .6s infinite" }} />
              )}
              <img src="/character.png" alt="" className="relative mb-[26px] w-[210px] object-contain drop-shadow-[0_12px_22px_rgba(4,125,134,.20)]"
                style={{
                  transformOrigin: "50% 100%",
                  animation: reduce
                    ? "splashRise .6s ease-out .2s both"
                    : "splashFloatIn .6s cubic-bezier(.2,.8,.2,1) both, splashHop .85s ease-in-out .6s infinite",
                }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
