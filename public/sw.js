// Logos Relational service worker. Pages and library data: network first, with a saved copy for offline reading of
// anything already opened. Static assets: cache first. Works under any base path (GitHub Pages serves /<repo>/).
const VERSION = "v3";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const BASE = new URL(self.registration.scope).pathname; // e.g. "/BIble-ed/"
const OFFLINE = `${BASE}offline/`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheable = (res) => res.ok && !res.redirected && res.type === "basic";

function networkFirst(req, cacheName, fallback) {
  return fetch(req)
    .then((res) => {
      if (cacheable(res)) {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || (fallback ? fallback() : Response.error())));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  const path = url.pathname.slice(BASE.length - 1);

  if (path.startsWith("/_next/static/") || /\.(woff2?|svg|png)$/.test(path)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }

  if (path.startsWith("/data/")) {
    event.respondWith(networkFirst(req, PAGES));
    return;
  }

  if (req.mode === "navigate") {
    // Verse, word and search pages share one page per route; any saved copy of the route will do offline.
    event.respondWith(
      networkFirst(req, PAGES, () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});
