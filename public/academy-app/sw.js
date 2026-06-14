/* Bucket Academy service worker — offline-first app shell + corpus.
 * After one online load, the app (and KaTeX) work offline. Progress lives in
 * localStorage, so a returning learner needs no network at all. */
const CACHE = "bucket-academy-v3";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/fsrs.js",
  "./js/engine.js",
  "./js/auth-config.js",
  "./js/auth.js",
  "./js/auth-ui.js",
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
  // Network-first for the corpus (so new atoms appear) and for auth-config.js
  // (so the founder enabling/disabling sign-in propagates without a cache bump);
  // cache-first for everything else.
  if (req.url.includes("/corpus/") || req.url.includes("/js/auth-config.js")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        // opportunistically cache CDN (KaTeX) + same-origin assets
        if (res.ok && (req.url.startsWith(self.location.origin) || req.url.includes("katex"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
