// وِردي — Service Worker: يعمل دون اتصال بعد أول تحميل
const VERSION = 'wirdi-v1.0.0';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/core.js', 'manifest.webmanifest',
  'data/quran.json', 'data/tajweed.json',
  'fonts/amiri-quran.woff2', 'fonts/naskh-400.woff2', 'fonts/naskh-600.woff2', 'fonts/plex-400.woff2', 'fonts/plex-500.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    // التفسير كاملًا (نحو ٢٫٣ ميغابايت) ليعمل دون اتصال
    const t = await caches.open('wirdi-data-v1');
    await Promise.all(Array.from({ length: 114 }, (_, i) => `data/tafsir/${i + 1}.json`).map((u) => t.match(u).then((m) => m || t.add(u)).catch(() => null)));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('wirdi-v') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const p = url.pathname;
  const isImg = /\/(mushaf|tafsir-pages|tajweed-pages)\//.test(p);
  const isData = /\/data\/tafsir\//.test(p);
  e.respondWith((async () => {
    const cacheName = isImg ? 'wirdi-img-v1' : isData ? 'wirdi-data-v1' : VERSION;
    const c = await caches.open(cacheName);
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(e.request);
      if (r.ok && (isImg || isData)) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      if (e.request.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const tab = (e.notification.data && e.notification.data.tab) || 'today';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) { all[0].focus(); all[0].postMessage({ tab }); return; }
    await self.clients.openWindow('./#' + tab);
  })());
});
