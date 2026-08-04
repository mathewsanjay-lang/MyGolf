// Fairway service worker.
//
// IMPORTANT: bump CACHE on every change to index.html / app.js / data.js.
// Changing this file's bytes is what makes the browser re-run install.
const CACHE = "fairway-v4";

// "./" covers index.html (cleanUrls redirects /index.html -> /), so don't
// list index.html separately — addAll is all-or-nothing and a redirected
// entry would abort the whole install.
const ASSETS = ["./", "./app.js", "./data.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Only ever cache our own successful responses — caching a 404/500 under
// cache-first would pin a broken app shell forever.
function putIfGood(request, res) {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App shell (navigations, JS, HTML, manifest): network-first so a deploy is
  // picked up immediately, falling back to cache when offline on the course.
  const isShell =
    req.mode === "navigate" || /(\/|\.html|\.js|\.webmanifest)$/.test(url.pathname);

  if (isShell) {
    e.respondWith(
      fetch(req)
        .then((res) => putIfGood(req, res))
        .catch(() => caches.match(req).then((c) => c || caches.match("./")))
    );
    return;
  }

  // Everything else (icons): cache-first, it never changes meaningfully.
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => putIfGood(req, res)).catch(() => cached)
    )
  );
});
