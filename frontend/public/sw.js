/* Service worker: makes My Library installable and lets the app shell open offline.
   - /api/...  : always the network (data is never cached, so it is never stale)
   - /assets/  : cache first (file names contain a hash, so they never change)
   - pages     : network first, falling back to the cached shell when offline
   Bump CACHE when this file changes, so old caches are removed. */
const CACHE = "my-library-v5";
const SHELL = ["/", "/theme-init.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/favicon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return res;
      }))
    );
  }
});
