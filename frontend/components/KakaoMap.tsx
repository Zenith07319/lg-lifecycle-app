"use client";
import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { kakao: any } }

type Pin = { name: string; lat: number | null; lng: number | null; distance_km?: number };

let sdkPromise: Promise<void> | null = null;
function loadSdk(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.kakao?.maps) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    s.onload = () => window.kakao.maps.load(() => resolve());
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export default function KakaoMap({ centers, user }: { centers: Pin[]; user?: { lat: number; lng: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => {
    if (!key || !ref.current) return;
    const pts = centers.filter((c) => c.lat != null && c.lng != null) as Required<Pin>[];
    if (!pts.length && !user) return;

    let cancelled = false;
    loadSdk(key).then(() => {
      if (cancelled || !ref.current) return;
      const kakao = window.kakao;
      const first = user ?? { lat: pts[0].lat, lng: pts[0].lng };
      const map = new kakao.maps.Map(ref.current, {
        center: new kakao.maps.LatLng(first.lat, first.lng),
        level: 6,
      });
      const bounds = new kakao.maps.LatLngBounds();

      // 센터 핀
      pts.forEach((c) => {
        const pos = new kakao.maps.LatLng(c.lat, c.lng);
        const mk = new kakao.maps.Marker({ position: pos, map });
        const iw = new kakao.maps.InfoWindow({
          content: `<div style="padding:5px 8px;font-size:12px;font-weight:700;white-space:nowrap">${c.name}${c.distance_km != null ? ` · ${c.distance_km}km` : ""}</div>`,
        });
        kakao.maps.event.addListener(mk, "click", () => iw.open(map, mk));
        bounds.extend(pos);
      });

      // 내 위치(빨간 원)
      if (user) {
        const upos = new kakao.maps.LatLng(user.lat, user.lng);
        new kakao.maps.Circle({
          center: upos, radius: 250, map,
          strokeWeight: 2, strokeColor: "#a50034", strokeOpacity: 0.9,
          fillColor: "#a50034", fillOpacity: 0.35,
        });
        bounds.extend(upos);
      }
      if (pts.length || user) map.setBounds(bounds);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [key, centers, user]);

  if (!key) return null;  // 키 없으면 지도 숨김(목록만)
  return <div ref={ref} className="w-full h-52 rounded-[18px] border border-line overflow-hidden mb-3" />;
}
