"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Clock, Navigation } from "lucide-react";

type Center = { name: string; addr: string; dist: string; tel: string; hours: string; open: boolean };
const CENTERS: Center[] = [
  { name: "LG전자 서비스센터 강남점", addr: "서울 강남구 테헤란로 152", dist: "1.2km", tel: "1544-7777", hours: "09:00–18:00", open: true },
  { name: "LG전자 서비스센터 서초점", addr: "서울 서초구 서초대로 396", dist: "2.8km", tel: "1544-7777", hours: "09:00–18:00", open: true },
  { name: "LG베스트샵 송파 서비스", addr: "서울 송파구 올림픽로 300", dist: "4.5km", tel: "1544-7777", hours: "10:00–19:00", open: false },
];
const RESERVE = "https://www.lge.co.kr/support/repair-and-engineer-visit?utm_source=ROR&utm_medium=center";

export default function CentersPage() {
  const router = useRouter();
  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="text-crimson"><ChevronLeft size={22} /></button>
        <h1 className="text-[16px] font-extrabold text-ink">주변 서비스센터</h1>
        <span className="ml-auto text-[11px] text-muted">LG 공식</span>
      </div>

      <div className="px-4 py-4">
        {/* 지도 영역 (시연용 플레이스홀더) */}
        <div className="relative h-36 rounded-[20px] overflow-hidden border border-line mb-4 bg-gradient-to-br from-[#e9eef5] to-[#dfe6f0]">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,.06) 1px, transparent 0)", backgroundSize: "18px 18px" }} />
          {[["38%", "44%"], ["58%", "32%"], ["46%", "66%"]].map(([l, t], i) => (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: l, top: t }}>
              <MapPin size={i === 0 ? 30 : 24} className="text-crimson drop-shadow" fill={i === 0 ? "#a50034" : "#fff"} />
            </div>
          ))}
          <div className="absolute bottom-2 left-2 text-[10.5px] font-bold text-ink/60 bg-white/70 rounded-full px-2 py-0.5">📍 내 위치 기준 3곳</div>
        </div>

        <div className="space-y-3">
          {CENTERS.map((c) => (
            <div key={c.name} className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-[14px] font-extrabold text-ink">{c.name}</h3>
                <span className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 ${c.open ? "text-[#1a7f3c] bg-[#eef8f0]" : "text-muted bg-[#f1efed]"}`}>{c.open ? "영업중" : "영업종료"}</span>
              </div>
              <p className="flex items-center gap-1 text-[12px] text-muted mt-1"><MapPin size={13} />{c.addr}</p>
              <div className="flex items-center gap-3 text-[12px] text-ink-soft mt-1">
                <span className="flex items-center gap-1"><Navigation size={12} className="text-crimson" />{c.dist}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{c.hours}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <a href={`tel:${c.tel}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-line text-ink-soft font-bold py-2.5 text-[13px]">
                  <Phone size={14} />전화
                </a>
                <a href={RESERVE} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 rounded-xl text-white font-extrabold py-2.5 text-[13px]" style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
                  방문 예약
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          ※ 위치·거리는 시연용 예시입니다. 실제 예약·출장수리는 LG전자 고객지원(1544-7777) 또는 LG.com에서 진행하세요.
        </p>
      </div>
    </div>
  );
}
