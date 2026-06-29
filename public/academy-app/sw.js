/* Bucket Academy service worker — offline-first app shell + corpus.
 * After one online load, the app (and KaTeX) work offline. Progress lives in
 * localStorage, so a returning learner needs no network at all. */
const CACHE = "bucket-academy-v6";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/fsrs.js",
  "./js/engine.js",
  "./js/auth-config.js",
  "./js/auth.js",
  "./js/auth-ui.js",
  "./js/polingual.js",
  "./js/lang-emoji.js",
  "./js/app.js",
  "./js/haptic.js",
  "./art/art-gen.js",
  "./corpus/biophysics.json",
  "./art/cache/05-biophysics.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];
// best-effort: art caches for other branches are added opportunistically on first fetch.

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = req.url.startsWith(self.location.origin);
  // NETWORK-FIRST for same-origin APP CODE + data so every deploy reaches users
  // immediately (no manual cache bump needed): HTML, JS, CSS, JSON, and the app root.
  // Falls back to cache when offline. This is why a returning PWA user used to get
  // stale code — cache-first JS/CSS. Static media (icons/fonts/images) + the KaTeX
  // CDN stay cache-first (they rarely change and are big).
  const isAppCode = sameOrigin && (
    req.mode === "navigate" ||
    /\.(html|js|css|json|webmanifest)(\?|$)/.test(req.url) ||
    req.url.endsWith("/")
  );
  if (isAppCode) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // CACHE-FIRST for static media + CDN (icons, fonts, images, KaTeX).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok && (sameOrigin || req.url.includes("katex"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
