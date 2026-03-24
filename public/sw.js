/**
 * 혜택줍줍 Service Worker
 *
 * 전략:
 *   - 정적 자산 (_next/static, 아이콘, manifest): CacheFirst — 빠른 로드
 *   - 앱 페이지 (/, /results 등): NetworkFirst — 항상 최신, 오프라인 시 캐시 제공
 *   - 외부 API 요청: 캐시 안 함 (데이터 정확성 보장)
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const PAGES_CACHE   = `pages-${CACHE_VERSION}`;

const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/icon-\d+\.png$/,
  /\/manifest\.json$/,
  /\/favicon\.ico$/,
  /\/data\/policies\.json$/,  // 정책 데이터 — CacheFirst (크기가 커서 재다운로드 최소화)
];

const PAGE_PATTERNS = [
  /^https:\/\/benefit-finder-jet\.vercel\.app\//,
];

// ── Install: pre-cache 앱 셸 ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
        '/favicon.ico',
        '/data/policies.json',  // 정책 데이터 pre-cache
      ])
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: 구 버전 캐시 정리 ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: 요청 유형별 캐싱 전략 ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // GET 요청만 처리
  if (request.method !== 'GET') return;

  // 정적 자산: CacheFirst
  if (STATIC_PATTERNS.some((p) => p.test(url))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 앱 페이지: NetworkFirst (10초 타임아웃)
  if (PAGE_PATTERNS.some((p) => p.test(url))) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timer);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached ?? new Response('오프라인 상태입니다. 인터넷 연결을 확인해주세요.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })
    );
    return;
  }
});
