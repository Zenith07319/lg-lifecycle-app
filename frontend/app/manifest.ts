import type { MetadataRoute } from "next";

// PWA 매니페스트 — /manifest.webmanifest 로 자동 제공·링크됨
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROR — Replace or Repair Check",
    short_name: "ROR",
    description: "우리 집 에어컨, 계속 쓸까 · 고칠까 · 바꿀까? 데이터로 비교해 결정.",
    start_url: "/",
    scope: "/",
    display: "standalone",          // 주소창 없이 전체화면(앱처럼)
    orientation: "portrait",
    background_color: "#f5efe9",
    theme_color: "#a50034",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
