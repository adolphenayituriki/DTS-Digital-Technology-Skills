import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { playSound } from '../utils/sound';
import Celebration from './Celebration';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TITLES = { success: 'Success', error: 'Something went wrong', info: 'Heads up' };

const MAX_VISIBLE = 4;
const NOOP = {
  notify: () => 0, success: () => 0, error: () => 0, info: () => 0,
  dismiss: () => {}, celebrate: () => {},
};

// Several effects can fail at once on a page load. Debounce so a burst plays
// one sound instead of a stutter.
const lastPlayed = { kind: null, at: 0 };
const playOnce = (type) => {
  const now = Date.now();
  if (lastPlayed.kind === type && now - lastPlayed.at < 700) return;
  lastPlayed.kind = type;
  lastPlayed.at = now;
  playSound(type);
};

// Safe to call from anywhere, even if a component renders outside the provider.
export function useToast() {
  return useContext(ToastContext) || NOOP;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [burst, setBurst] = useState(null);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  // The visible list is mirrored into a ref so `push` can read it synchronously.
  // That is what keeps the context value permanently stable: every callback
  // below depends only on other stable callbacks, never on the toast list.
  //
  // This matters more than it looks. Many pages fetch in an effect that lists
  // `toast` in its dependency array and calls `toast.error` in its catch. If the
  // context value changed identity on every push, a single failed request would
  // push a toast, change the context, re-run the effect, fail again, and refetch
  // forever. A stable value makes those dependency arrays inert.
  const toastsRef = useRef([]);

  // Every write goes through here, so the ref and the rendered state can never
  // drift apart. Deliberately not a setState updater: the next list is computed
  // from the ref beforehand, which keeps the read-then-write sequence atomic
  // across several pushes in the same tick.
  const commit = useCallback((next) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback((id) => {
    commit(toastsRef.current.filter((t) => t.id !== id));
    clearTimer(id);
  }, [commit, clearTimer]);

  // The ceremony. `grand: true` for milestones (application sent, signup).
  const celebrate = useCallback((options = {}) => {
    setBurst({
      id: ++idRef.current,
      grand: !!options.grand,
      message: options.message || '🎉',
    });
  }, []);

  const clearBurst = useCallback(() => setBurst(null), []);

  const push = useCallback((message, type = 'success', opts = {}) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (!text.trim()) return null;

    const id = ++idRef.current;
    const duration = opts.duration ?? (type === 'error' ? 5200 : 4000);
    const title = opts.title || TITLES[type] || TITLES.info;

    const list = toastsRef.current;

    // Collapse an identical message that is already on screen instead of
    // stacking duplicates (common when several effects fail at once).
    const existing = list.find((t) => t.message === text && t.type === type);
    if (existing) {
      clearTimer(existing.id);
      if (duration > 0) {
        timersRef.current.set(
          existing.id,
          window.setTimeout(() => dismiss(existing.id), duration)
        );
      }
      // Restating the same toast only needs a re-render if something it shows
      // actually changed. Skipping the commit keeps a repeat push free.
      if (existing.duration !== duration || existing.title !== title) {
        commit(list.map((t) => (t.id === existing.id ? { ...t, duration, title } : t)));
      }
      return existing.id;
    }

    // Drop the oldest so the stack never runs off screen.
    const overflow = list.slice(0, Math.max(0, list.length - (MAX_VISIBLE - 1)));
    overflow.forEach((t) => clearTimer(t.id));
    commit([...overflow, { id, message: text, type, title, duration }]);

    if (duration > 0) {
      timersRef.current.set(id, window.setTimeout(() => dismiss(id), duration));
    }

    // A completed action gets the sound and the ceremony. A success that
    // explicitly opts out (e.g. a silent background refresh) gets neither.
    if (opts.silent !== true) {
      playOnce(type);
      if (type === 'success' && opts.celebrate !== false) {
        celebrate({ grand: opts.grand, message: opts.emoji });
      }
    }
    return id;
  }, [celebrate, clearTimer, commit, dismiss]);

  // Built once and never rebuilt. Every dependency above is referentially
  // stable, so adding `toasts` (or any rendered state) to this list would
  // reintroduce the refetch loop described at the top of the provider.
  const value = useMemo(() => ({
    notify: push,
    success: (m, o) => push(m, 'success', o),
    error: (m, o) => push(m, 'error', o),
    info: (m, o) => push(m, 'info', o),
    dismiss,
    celebrate,
  }), [push, dismiss, celebrate]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Celebration burst={burst} onDone={clearBurst} />
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="status">
              <span className="toast-icon"><Icon size={18} /></span>
              <div className="toast-content">
                <p className="toast-title">{t.title}</p>
                <p className="toast-message">{t.message}</p>
              </div>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={15} />
              </button>
              {t.duration > 0 && (
                <span className="toast-bar" style={{ animationDuration: `${t.duration}ms` }} />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
