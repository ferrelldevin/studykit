// Kurikaeshi service worker, written by publish-studykit-bw08.mjs. Do not edit here.
const VERSION = "0.7.0";
const BUILD = "8507379f8087";
const CACHE = 'kurikaeshi-' + VERSION + '-' + BUILD;
// './' is deliberately absent. It resolves to the same document as './index.html', so listing both
// downloaded the whole page twice on every install and update, and the fetch handler below only
// ever reads './index.html'.
const PRECACHE = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' makes each precache fetch go past the browser's HTTP cache to the network.
      // index.html is served with max-age=600, so without it a worker installing within ten minutes
      // of a page load could fill its new cache from the stored copy of the OLD page and pin that
      // under the new version, giving an update that silently does not update.
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kurikaeshi-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
const APP_ENTRY = new URL('./', self.location).pathname;
const isAppEntry = (url) => url.pathname === APP_ENTRY || url.pathname === APP_ENTRY + 'index.html';
// Read the shell out of THIS worker's own cache rather than whichever cache answers first, so a
// previous version's entry cannot be served in the moment before activate has cleared it.
const shell = () => caches.open(CACHE).then((c) => c.match('./index.html'));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    // Only the app's own entry is answered from the shell. A sibling document in this folder —
    // for-your-class.html — is its own page and must never be replaced by the app.
    if (isAppEntry(url)) {
      e.respondWith(shell().then((r) => r || fetch(e.request)));
    } else {
      e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((r) => r || Response.error())));
    }
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
