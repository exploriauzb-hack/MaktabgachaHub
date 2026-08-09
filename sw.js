/* MaktabgachaHub — Service Worker
   - Sahifalar: network-first (yangi kontent), oflaynda keshdan.
   - Statik (css/js/font/rasm): cache-first (tez).
   - Supabase / API so'rovlari: HECH QACHON keshlanmaydi (doim yangi ma'lumot).
*/
const CACHE = 'mgh-v2';
const CORE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/style.css',
  '/manifest.json',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/premium.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Supabase va tashqi API — keshlamaymiz, to'g'ridan-to'g'ri tarmoq
  if (url.hostname.endsWith('supabase.co') ||
      url.hostname.includes('supabase') ||
      url.pathname.startsWith('/rest/') ||
      url.pathname.startsWith('/auth/')) {
    return; // brauzer o'zi hal qiladi
  }

  // Faqat o'z originimiz
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // Network-first: yangi sahifa, tarmoq yo'q bo'lsa keshdan
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/dashboard.html')))
    );
    return;
  }

  // Statik: cache-first
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
