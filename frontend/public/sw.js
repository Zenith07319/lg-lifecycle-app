// ROR PWA 서비스워커 — 설치 가능 요건(fetch 핸들러) + 네비게이션 오프라인 폴백.
// API/데이터는 캐시하지 않음(항상 최신). 화면 이동만 오프라인 시 홈으로 폴백.
const CACHE = "ror-shell-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 페이지 이동(navigate)만 처리: 네트워크 우선, 실패 시 캐시된 홈으로 폴백
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
  // 그 외(정적 자산·API)는 브라우저 기본 동작(캐시 개입 안 함)
});
