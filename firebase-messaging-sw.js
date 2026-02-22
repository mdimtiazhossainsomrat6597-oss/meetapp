// =====================================================
// firebase-messaging-sw.js
// এই ফাইলটি আপনার ওয়েবসাইটের ROOT ফোল্ডারে রাখুন
// যেমন: index.html এর পাশে
// =====================================================

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

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

// Background নোটিফিকেশন হ্যান্ডেল করুন
// (অ্যাপ বন্ধ থাকলে বা অন্য ট্যাবে থাকলে এটি কাজ করে)
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background নোটিফিকেশন:", payload);

  const notificationTitle = payload.notification?.title || "MeetApp নোটিফিকেশন";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon.png",          // আপনার অ্যাপের আইকন পাথ
    badge: "/badge.png",        // ছোট badge আইকন (optional)
    data: payload.data || {},
    vibrate: [200, 100, 200],   // মোবাইলে ভাইব্রেশন
    requireInteraction: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// নোটিফিকেশনে ক্লিক করলে অ্যাপ খুলুন
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // যদি অ্যাপ ইতিমধ্যে খোলা থাকে তাহলে সেটি focus করুন
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // না থাকলে নতুন ট্যাবে খুলুন
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
