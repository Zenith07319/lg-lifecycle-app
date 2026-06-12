/* Figma 공통 배경: 틸·그린 blur 블롭. 앱 셸 뒤에 고정 장식 (z-0, pointer 무시). */
export default function AmbientBlobs() {
  const blobs = [
    { w: 200, h: 200, left: "-3%", top: "32%", bg: "rgba(66,173,181,.45)", blur: 90 },
    { w: 260, h: 300, left: "42%", top: "52%", bg: "rgba(66,173,181,.40)", blur: 90 },
    { w: 220, h: 270, left: "50%", top: "84%", bg: "rgba(183,221,165,.55)", blur: 90 },
    { w: 300, h: 290, left: "48%", top: "20%", bg: "rgba(139,210,104,.28)", blur: 60 },
    { w: 210, h: 220, left: "2%", top: "68%", bg: "rgba(190,229,171,.5)", blur: 90 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-50"
          style={{ width: b.w, height: b.h, left: b.left, top: b.top, background: b.bg, filter: `blur(${b.blur}px)` }}
        />
      ))}
    </div>
  );
}
