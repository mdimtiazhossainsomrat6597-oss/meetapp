// ═══════════════════════════════════════════════════════
// MeetApp Firebase Cloud Messaging Service Worker
// এই ফাইলটি অবশ্যই আপনার ওয়েবসাইটের ROOT ডিরেক্টরিতে রাখতে হবে
// যেমন: https://yoursite.com/firebase-messaging-sw.js
// ═══════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase Config — index.html এর মতো একই config
firebase.initializeApp({
  apiKey: "AIzaSyBkV5DJpMwedW1ZbPYil4NBZL1GP_4BMz8",
  authDomain: "photo-share-app-c65fd.firebaseapp.com",
  databaseURL: "https://photo-share-app-c65fd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photo-share-app-c65fd",
  storageBucket: "photo-share-app-c65fd.firebasestorage.app",
  messagingSenderId: "585105127605",
  appId: "1:585105127605:web:cc948af7e01cef8c39e6fc",
  measurementId: "G-YCT4B00WMY"
});

const messaging = firebase.messaging();

// ═══════════════════════════════════════════════════════
// Background নোটিফিকেশন হ্যান্ডেল করুন
// (অ্যাপ বন্ধ বা minimize থাকলে এটা কাজ করবে)
// ═══════════════════════════════════════════════════════
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);

  var notification = payload.notification || {};
  var data = payload.data || {};

  var title = notification.title || data.title || 'MeetApp';
  var body = notification.body || data.body || '';
  var icon = notification.icon || data.icon || '/icon-192.png';

  var notificationOptions = {
    body: body,
    icon: icon,
    badge: '/icon-192.png',
    tag: data.tag || 'meetapp-notification',
    data: {
      url: data.clickUrl || '/',
      ...data
    },
    // Vibrate pattern: buzz buzz buzz
    vibrate: [200, 100, 200],
    // Notification actions (Android)
    actions: [
      { action: 'open', title: '📱 খুলুন' },
      { action: 'dismiss', title: '✕ বাদ দিন' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// ═══════════════════════════════════════════════════════
// Notification click হ্যান্ডেল করুন
// ═══════════════════════════════════════════════════════
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'dismiss') return;

  var urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // আগে থেকে কোনো window খোলা থাকলে সেটা focus করো
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // নতুন window খুলুন
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ═══════════════════════════════════════════════════════
// Push event (raw push — FCM ছাড়া direct push হলে)
// ═══════════════════════════════════════════════════════
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      var payload = event.data.json();
      var notification = payload.notification || {};
      var title = notification.title || 'MeetApp';
      var options = {
        body: notification.body || '',
        icon: notification.icon || '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'meetapp-push'
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.warn('[SW] Push parse error:', e);
    }
  }
});

// ═══════════════════════════════════════════════════════
// Service Worker Activate — পুরনো cache পরিষ্কার করুন
// ═══════════════════════════════════════════════════════
self.addEventListener('activate', function(event) {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('install', function(event) {
  console.log('[SW] Installed');
  self.skipWaiting();
});
