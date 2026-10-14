// Logos Relational service worker: network-first pages with an offline copy of reading pages you have opened,
// cache-first static assets. Private pages (notes, editor, sign-in) and API responses are never cached.
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE = "/offline";
const PRIVATE = /^\/(api|edit|notes|login)(\/|$)/;

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(woff2?|svg|png)$/.test(url.pathname)) {
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

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});
