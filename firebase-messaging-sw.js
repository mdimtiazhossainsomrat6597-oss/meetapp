// Firebase Cloud Messaging Service Worker
// এই ফাইলটি root directory তে থাকতে হবে (index.html এর পাশে)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBkV5DJpMwedW1ZbPYil4NBZL1GP_4BMz8",
  authDomain: "photo-share-app-c65fd.firebaseapp.com",
  databaseURL: "https://photo-share-app-c65fd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photo-share-app-c65fd",
  storageBucket: "photo-share-app-c65fd.firebasestorage.app",
  messagingSenderId: "585105127605",
  appId: "1:585105127605:web:cc948af7e01cef8c39e6fc",
  measurementId: "G-YCT4B00WMY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ✅ Background Message Handler - App বন্ধ থাকলে এটা কাজ করবে
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Background notification received:', payload);
  
  const notificationData = payload.notification || {};
  const customData = payload.data || {};
  
  // Notification Title & Body
  const notificationTitle = notificationData.title || customData.title || 'MeetApp';
  const notificationBody = notificationData.body || customData.body || 'নতুন বার্তা';
  
  // Icon & Badge
  const notificationIcon = notificationData.icon || customData.icon || '/icon.png';
  const notificationBadge = '/icon.png';
  
  // Notification Options
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge,
    tag: customData.tag || 'meetapp-notification',
    requireInteraction: false, // Auto-dismiss after a while
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern - তিনবার লম্বা
    data: {
      url: customData.url || '/',
      clickAction: customData.click_action || '/',
      soundEmoji: customData.sound || '🔔'
    },
    actions: [
      {
        action: 'open',
        title: 'খুলুন',
        icon: '/icon.png'
      },
      {
        action: 'close',
        title: 'বন্ধ করুন'
      }
    ]
  };
  
  // ✅ Show Notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Notification Click Handler - User notification এ click করলে
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close(); // Notification close করো
  
  // Handle different actions
  if (event.action === 'close') {
    return; // Just close, do nothing
  }
  
  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || event.notification.data?.clickAction || '/';
  
  // ✅ App খোলো বা focus করো
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // যদি app already open থাকে, তাহলে focus করো
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus().then(client => {
              // ✅ Sound play করার জন্য message পাঠাও
              if (client.postMessage) {
                client.postMessage({
                  type: 'PLAY_NOTIFICATION_SOUND',
                  emoji: event.notification.data?.soundEmoji || '🔔'
                });
              }
              // Navigate to URL if needed
              if (urlToOpen !== '/' && client.navigate) {
                return client.navigate(urlToOpen);
              }
              return client;
            });
          }
        }
        
        // যদি app open না থাকে, নতুন window খোলো
        const fullUrl = new URL(urlToOpen, self.location.origin).href;
        return clients.openWindow(fullUrl);
      })
  );
});

// ✅ Service Worker Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Firebase Messaging SW activated');
  event.waitUntil(self.clients.claim());
});

// ✅ Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('✅ Firebase Messaging SW installed');
  self.skipWaiting();
});
