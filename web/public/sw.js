// PleaseHome PWA Service Worker (Cache-first for hashed static assets, Network-only for pages with offline fallback)
// build:pack이 배포마다 v1을 빌드 타임스탬프로 치환 → sw.js가 바뀌어 새 SW 설치, activate에서 옛 캐시 삭제
const CACHE_NAME = 'pleasehome-pwa-v1';

const STATIC_PRECACHE = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 다른 도메인(네이버 지도 타일 등), API, POST 요청은 SW가 관여하지 않고 브라우저 기본 동작에 맡김
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // _next/static은 파일명에 콘텐츠 해시가 붙어 불변이므로 Cache-First (옛 버전이 보일 일이 없음)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }))
    );
    return;
  }

  // 페이지 이동: 항상 네트워크, 오프라인일 때만 설치 시 받아둔 홈('/') 반환 (페이지별 캐시를 쌓지 않음)
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
  }
});
