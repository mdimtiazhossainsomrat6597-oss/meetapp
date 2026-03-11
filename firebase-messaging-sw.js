// ✅ firebase-messaging-sw.js
// এই ফাইলটি index.html-এর পাশে (root/public ফোল্ডারে) রাখুন

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ✅ আপনার Firebase Config (index.html-এর মতোই)
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

// ✅ Background নোটিফিকেশন হ্যান্ডেল (অ্যাপ বন্ধ/মিনিমাইজ থাকলে)
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background নোটিফিকেশন পেয়েছি:', payload);

  const notif    = payload.notification || {};
  const data     = payload.data || {};
  const title    = notif.title || data.title || 'MeetApp';
  const body     = notif.body  || data.body  || '';
  const icon     = notif.icon  || data.icon  || './icon.png';
  const clickUrl = data.url    || notif.click_action || './';
  const emoji    = data.emoji  || '🔔';

  const options = {
    body: body,
    icon: icon,
    badge: './icon.png',
    tag: data.tag || 'meetapp-notification',
    renotify: true,
    data: {
      url: clickUrl,
      emoji: emoji
    },
    actions: [
      { action: 'open', title: '📖 খুলুন' },
      { action: 'close', title: '❌ বন্ধ করুন' }
    ]
  };

  return self.registration.showNotification(title, options);
});

// ✅ Notification ক্লিক হ্যান্ডেল
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || './';
  const emoji     = notifData.emoji || '🔔';

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // ✅ Sound বাজানোর জন্য open window-কে message পাঠাও
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND', emoji: emoji });
        // আগে খোলা ট্যাব থাকলে সেটা focus করো
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // নতুন ট্যাব খোলো
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
