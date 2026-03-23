const CACHE = 'wj-v3';
const FILES = ['/index.html', '/sw.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      }
      return res;
    })).catch(() => caches.match('/index.html'))
  );
});

// Notification scheduling
let notifOn = false;
let sentToday = {};

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'NOTIF_ENABLE')  { notifOn = true;  startTick(); }
  if (e.data.type === 'NOTIF_DISABLE') { notifOn = false; }
});

function startTick() {
  setInterval(tick, 30000); // check every 30s while SW is alive
  tick(); // immediate check on enable
}

function tick() {
  if (!notifOn) return;
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const today = now.toDateString();

  if (today !== sentToday.date) sentToday = { date: today };

  if (h === 12 && m <= 1 && !sentToday.noon) {
    sentToday.noon = true;
    self.registration.showNotification('Work Journal \u270d\ufe0f', {
      body: "Time to log your morning \u2014 what have you been working on?",
      tag: 'noon', renotify: true, vibrate: [200,100,200],
      actions: [{ action: 'open', title: 'Log now' }]
    });
  }

  if (h === 16 && m >= 45 && !sentToday.eod) {
    sentToday.eod = true;
    self.registration.showNotification('Work Journal \u270d\ufe0f', {
      body: "End of day \u2014 log before you wrap up so Friday is easy.",
      tag: 'eod', renotify: true, vibrate: [200,100,200],
      actions: [{ action: 'open', title: 'Log now' }]
    });
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
