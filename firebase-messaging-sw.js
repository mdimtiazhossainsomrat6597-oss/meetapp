// MeetApp Firebase Messaging Service Worker
// ✅ Push notification + Sound + Vibration support
// ✅ App বন্ধ থাকলেও notification, click করলে sound বাজবে

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBkV5DJpMwedW1ZbPYil4NBZL1GP_4BMz8",
  authDomain: "photo-share-app-c65fd.firebaseapp.com",
  databaseURL: "https://photo-share-app-c65fd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photo-share-app-c65fd",
  storageBucket: "photo-share-app-c65fd.firebasestorage.app",
  messagingSenderId: "585105127605",
  appId: "1:585105127605:web:cc948af7e01cef8c39e6fc"
});

const messaging = firebase.messaging();

// ══════════════════════════════════════════════════════
// Background push notification হ্যান্ডেল করুন
// ══════════════════════════════════════════════════════
messaging.onBackgroundMessage(function(payload) {
  console.log('📩 Background message:', payload);

  const { title, body, icon } = payload.notification || {};
  const data = payload.data || {};

  // ✅ App খোলা থাকলে sound বাজাও (foreground client আছে কিনা চেক)
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    if (clients.length > 0) {
      // App খোলা আছে — sound বাজাও
      clients.forEach(client => {
        client.postMessage({
          type: 'PLAY_NOTIFICATION_SOUND',
          emoji: data.emoji || '🔔'
        });
      });
    }
    // App বন্ধ থাকলে — sound বাজানো সম্ভব না (browser security)
    // তবে notification দেখাবে, click করলে sound বাজবে ✅
  });

  // ✅ Notification দেখাও
  return self.registration.showNotification(title || 'MeetApp 🔔', {
    body: body || '',
    icon: icon || 'https://ui-avatars.com/api/?name=MA&size=192&background=1877f2&color=ffffff&bold=true',
    badge: 'https://ui-avatars.com/api/?name=MA&size=96&background=1877f2&color=ffffff&bold=true',
    vibrate: [300, 100, 300, 100, 300], // ✅ ভাইব্রেট (সব সময় কাজ করে)
    tag: 'meetapp-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/meetapp/',   // ✅ FIX: GitHub Pages সঠিক path
      emoji: data.emoji || '🔔',
      playSound: true                 // ✅ click করলে sound বাজানোর flag
    }
  });
});

// ══════════════════════════════════════════════════════
// Notification ক্লিক করলে অ্যাপ খুলবে + Sound বাজবে
// ══════════════════════════════════════════════════════
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const notifData = event.notification.data || {};
  const url = notifData.url || '/meetapp/';   // ✅ FIX: GitHub Pages সঠিক path
  const emoji = notifData.emoji || '🔔';
  const playSound = notifData.playSound || false;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {

      // ✅ App আগে থেকে খোলা থাকলে — focus করো + sound বাজাও
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (playSound) {
            client.postMessage({
              type: 'PLAY_NOTIFICATION_SOUND',
              emoji: emoji
            });
          }
          return client.focus();
        }
      }

      // ✅ App বন্ধ থাকলে — নতুন window খোলো, URL-এ sound param দাও
      const openUrl = playSound
        ? (url + (url.includes('?') ? '&' : '?') + 'sound=' + encodeURIComponent(emoji))
        : url;
      return self.clients.openWindow(openUrl);
    })
  );
});

// ══════════════════════════════════════════════════════
// Service Worker Activate — পুরনো cache পরিষ্কার
// ══════════════════════════════════════════════════════
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
  console.log('✅ firebase-messaging-sw.js activated');
});
