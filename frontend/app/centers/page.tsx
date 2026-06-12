"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, Clock, Loader2, Navigation, LocateFixed } from "lucide-react";
import { AppHeader } from "@/components/ui";
import { getCenters, getCentersNearby } from "@/lib/api";
import type { CentersResponse } from "@/lib/types";
import KakaoMap from "@/components/KakaoMap";

export default function CentersPage() {
  const router = useRouter();
  const [data, setData] = useState<CentersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // 초기: 기본 지역
  useEffect(() => {
    getCenters().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadRegion = (region: string) => {
    setLoading(true); setGeoError(""); setUserLoc(null);
    getCenters(region).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  const loadNearby = () => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("이 브라우저는 위치를 지원하지 않아요."); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        getCentersNearby(pos.coords.latitude, pos.coords.longitude)
          .then(setData).catch(() => setGeoError("센터를 불러오지 못했어요."))
          .finally(() => setGeoLoading(false));
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.code === err.PERMISSION_DENIED
          ? "위치 권한이 거부됐어요. 지역을 직접 선택해 주세요."
          : "위치를 가져오지 못했어요. 지역을 선택해 주세요.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const nearby = data?.mode === "nearby";

  return (
    <div className="pb-28">
      <AppHeader
        title="주변 서비스센터"
        back
        right={<span className="text-[11px] font-semibold text-muted">LG 공식</span>}
      />

      <div className="px-6 pt-3">
        {/* 내 주변 CTA */}
        <button onClick={loadNearby} disabled={geoLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-extrabold transition active:scale-[.99] ${nearby ? "text-white" : "border border-accent text-accent"}`}
          style={nearby ? { background: "linear-gradient(135deg,#047d86,#034349)" } : {}}>
          {geoLoading ? <Loader2 className="animate-spin" size={17} /> : <LocateFixed size={17} />}
          {geoLoading ? "내 위치 확인 중…" : "내 주변 센터 찾기"}
        </button>
        {geoError && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">{geoError}</p>
        )}

        {/* 지역 선택 칩 */}
        {data && (
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
            {data.regions.map((rg) => (
              <button key={rg} onClick={() => loadRegion(rg)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${!nearby && data.selected === rg ? "border-accent bg-accent-soft text-accent" : "border-line bg-white/70 text-ink-soft"}`}>{rg}</button>
            ))}
          </div>
        )}

        {/* 통합 고객센터 */}
        {data && (
          <a href={`tel:${data.tel}`}
            className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-white/64 px-4 py-3 text-[12px] text-ink-soft shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
            <Phone size={14} className="text-accent" /> 통합 고객센터 <b className="text-ink">{data.tel}</b>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted"><Clock size={12} />{data.hours}</span>
          </a>
        )}

        {loading ? (
          <p className="py-12 text-center text-[13px] text-muted"><Loader2 className="mr-1 inline animate-spin" size={14} />불러오는 중…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-muted">센터 정보가 없어요.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* 지도 */}
            <div className="overflow-hidden rounded-[18px] shadow-[0_2px_8px_rgba(5,31,31,.06)]">
              <KakaoMap centers={data.items} user={userLoc} />
            </div>

            <p className="px-1 text-[11.5px] font-medium text-muted">{nearby ? "📍 내 위치에서 가까운 순" : `${data.selected} · ${data.count}곳`}</p>

            {/* 센터 카드 */}
            {data.items.map((c) => (
              <div key={c.name + c.address}
                className="rounded-[18px] border border-line bg-white/64 p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 text-[14px] font-extrabold text-ink">{c.name}</h3>
                  {typeof c.distance_km === "number" && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-extrabold text-accent">
                      <Navigation size={11} />{c.distance_km}km
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-start gap-1 text-[12px] text-muted"><MapPin size={13} className="mt-0.5 shrink-0" />{c.address}</p>
                {c.repair && <p className="mt-1 text-[11.5px] text-ink-soft">🔧 {c.repair}</p>}
                {c.note && <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">ℹ {c.note}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`tel:${data.tel}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white/80 py-2.5 text-[13px] font-bold text-ink-soft">
                    <Phone size={14} />전화
                  </a>
                  <a href={data.reserve_url} target="_blank" rel="noopener"
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg,#047d86,#034349)" }}>
                    방문 예약
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted">
          ※ LG전자 전국 서비스센터(2025 기준). 거리는 직선거리 추정이며, 정확한 운영시간·휴무·예약은 LG전자 고객지원(1544-7777) 또는 LG.com에서 확인하세요.
        </p>
      </div>
    </div>
  );
}
