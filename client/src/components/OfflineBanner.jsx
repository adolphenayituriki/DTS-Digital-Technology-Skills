import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// `navigator.onLine` is the browser's verdict on the network interface, not a
// guarantee the internet answers - but the `online` / `offline` events fire the
// moment it changes, which is exactly when the user needs telling.
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    // No `window` means the build-time render, where there is no connection to
    // report and online is the only answer that keeps this banner out of the
    // static HTML. Checking `navigator` alone is not enough: Node 21+ defines a
    // global navigator with no `onLine` property, which reads as offline and
    // used to bake the banner into every prerendered page.
    () => typeof window === 'undefined' || window.navigator.onLine !== false,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

// Rendered at the very top of AppShell, above every route, so the message
// survives navigation and the admin, staff and public shells all get it. It is
// in normal document flow rather than fixed, so it can never cover the sticky
// navbar or the mobile tab bar.
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={14} aria-hidden="true" />
      <span>
        <b>You are offline.</b> Pages you have already opened still work, but live
        data cannot load until the connection returns.
      </span>
    </div>
  );
}
