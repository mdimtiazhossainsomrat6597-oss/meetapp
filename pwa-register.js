// pwa-register.js — MeetApp PWA Helper
// এই ফাইলটি আপনার index.html এ include করুন

(async function initPWA() {

  // 1. Service Worker Register
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/meetapp/service-worker.js', {
        scope: '/meetapp/'
      });
      console.log('[PWA] SW Registered:', reg.scope);

      // SW update check
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available! Refreshing...');
            newSW.postMessage('SKIP_WAITING');
            window.location.reload();
          }
        });
      });

    } catch (err) {
      console.error('[PWA] SW Registration failed:', err);
    }
  }

  // 2. Install Prompt (Android)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Custom install button দেখান (যদি থাকে)
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Install:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });

  // 3. Push Notification Subscribe
  window.subscribePush = async function(vapidPublicKey) {
    if (!('Notification' in window)) {
      alert('এই browser Notification support করে না।');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[PWA] Notification permission denied');
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[PWA] Push subscription:', JSON.stringify(subscription));

      // আপনার server-এ পাঠান
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      return subscription;
    } catch (err) {
      console.error('[PWA] Push subscription failed:', err);
      return null;
    }
  };

  // Helper: VAPID key convert
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  // 4. Background Sync register
  window.registerSync = async function() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('meetapp-sync');
      console.log('[PWA] Background sync registered');
    }
  };

  console.log('[PWA] MeetApp PWA initialized ✓');

})();
