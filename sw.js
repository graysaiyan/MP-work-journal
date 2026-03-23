const CACHE = 'wj-cache-v2';
const ASSETS = ['/index.html', '/sw.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    })).catch(() => caches.match('/index.html'))
  );
});

// ── Notification scheduling ───────────────────────────────
let notifTimers = [];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFS') {
    scheduleAll(e.data.slots);
  }
});

function scheduleAll(slots) {
  notifTimers.forEach(t => clearTimeout(t));
  notifTimers = [];
  const now = Date.now();
  slots.forEach(({ ms, title, body }) => {
    const delay = ms - now;
    if (delay > 0 && delay < 86400000 * 2) { // within 2 days
      notifTimers.push(setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: title + ms,
          renotify: true,
          vibrate: [200, 100, 200],
          actions: [{ action: 'open', title: 'Log now' }]
        });
      }, delay));
    }
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        if (list.length) return list[0].focus();
        return clients.openWindow('/');
      })
    );
  }
});
