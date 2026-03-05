// MeetApp Firebase Messaging Service Worker
// ✅ Push notification + Sound + Vibration support

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

  // ✅ Sound বাজানোর জন্য audio channel trick
  // Service worker থেকে সব open client-কে message পাঠাই
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        emoji: data.emoji || '🔔'
      });
    });
  });

  // ✅ Notification দেখাও
  return self.registration.showNotification(title || 'MeetApp 🔔', {
    body: body || '',
    icon: icon || 'https://ui-avatars.com/api/?name=MA&size=192&background=1877f2&color=ffffff&bold=true',
    badge: 'https://ui-avatars.com/api/?name=MA&size=96&background=1877f2&color=ffffff&bold=true',
    vibrate: [300, 100, 300, 100, 300], // ✅ ভাইব্রেট
    sound: '/notification.mp3',          // ✅ Android PWA তে কাজ করে
    tag: 'meetapp-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/' }
  });
});

// ══════════════════════════════════════════════════════
// Notification ক্লিক করলে অ্যাপ খুলবে
// ══════════════════════════════════════════════════════
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
