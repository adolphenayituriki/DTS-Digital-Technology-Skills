// Registers the service worker that keeps the site usable without a
// connection (see public/sw.js for the caching rules).
//
// Production only: in dev a worker would serve stale modules and fight Vite's
// hot reload. Registration failures are swallowed on purpose - a browser that
// blocks service workers (private mode, some in-app browsers) must still get a
// working site, just without the offline behaviour.
export default function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
