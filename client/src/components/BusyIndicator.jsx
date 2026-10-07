import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { beginBusy, endBusy, subscribeBusy } from '../busy';

// The global activity indicator: a small pill with the 12-spoke ring that
// floats at the top centre of the screen whenever the app is busy - an
// apiFetch in flight, or a route transition settling. It never blocks input,
// so a slow page keeps its own centred spinner while the pill covers the
// "something is happening" case that has no spinner of its own.
//
// Mounted once in AppShell, so it covers the public shell and every staff
// workspace alike. Server renders it as null (visible starts false and the
// store only flips in an effect), which keeps hydration markup identical.

const PULSE_END_MS = 350;

export default function BusyIndicator() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const startedRoutePulse = useRef(false);

  useEffect(() => subscribeBusy(setVisible), []);

  // Route pulse: navigation itself is a busy period, even when no request
  // follows it (a cached page, a client-side only route). Hold the pill until
  // the new route has painted plus a short floor, so a fast transition still
  // reads as feedback rather than not registering at all.
  useEffect(() => {
    if (!startedRoutePulse.current) {
      // First run is the initial page load, not a navigation: the prerendered
      // content is already on screen, so there is nothing to signal.
      startedRoutePulse.current = true;
      return undefined;
    }
    beginBusy();
    let ended = false;
    let innerRaf = 0;
    let timer = 0;
    const end = () => {
      if (ended) return;
      ended = true;
      endBusy();
    };
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        timer = setTimeout(end, PULSE_END_MS);
      });
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      clearTimeout(timer);
      end();
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="busy-pill" role="status" aria-live="polite">
      <span className="spinner busy-pill-ring" aria-hidden="true" />
      <span className="busy-pill-label">Loading...</span>
    </div>
  );
}
