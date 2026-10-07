// Global busy store behind the activity indicator.
//
// Every apiFetch and every route transition calls beginBusy/endBusy, and the
// BusyIndicator component subscribes to know when to show the pill. The two
// timing rules are what keep it from being noise:
//
//   - nothing appears unless the app stays busy for 150ms, so a fast cached
//     request never flashes a pill on screen;
//   - once shown it lingers 400ms after the last session ends, so back-to-back
//     requests and a route change followed by a fetch read as one continuous
//     "busy" instead of a strobe.
//
// The module is deliberately free of window/DOM at import time: api.js is
// imported by the prerendered server bundle, and touching timers or the DOM
// here would take the SSR build down with it.

let pending = 0;
let visible = false;
let showTimer = null;
let hideTimer = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(visible));
};

const SHOW_DELAY_MS = 150;
const HIDE_DELAY_MS = 400;

export function beginBusy() {
  pending += 1;
  if (pending !== 1) return;
  // A new session arrived while the hide timer was still counting down: the
  // app never actually went idle, so cancel the fade-out.
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (visible) return;
  if (showTimer) clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    showTimer = null;
    if (pending > 0 && !visible) {
      visible = true;
      notify();
    }
  }, SHOW_DELAY_MS);
}

export function endBusy() {
  if (pending === 0) return;
  pending -= 1;
  if (pending > 0) return;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (!visible) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (pending === 0 && visible) {
      visible = false;
      notify();
    }
  }, HIDE_DELAY_MS);
}

export function subscribeBusy(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isBusyVisible() {
  return visible;
}
