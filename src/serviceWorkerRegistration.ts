/**
 * Service Worker Registration for Jifuno PWA
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (!installingWorker) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New version available; will activate on next reload.');
                } else {
                  console.log('[SW] App cached offline successfully.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[SW] Registration failed:', error);
        });
    });
  }
}
