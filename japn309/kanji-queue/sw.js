// Retired address. This worker replaces the Kanji Queue worker, empties its caches,
// unregisters, and reloads any open window so the redirect page is what loads next.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((cs) => cs.forEach((c) => c.navigate(c.url)))
  );
});
