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

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

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

    // Collapse an identical message that is already on screen instead of
    // stacking duplicates (common when several effects fail at once).
    const existing = toasts.find((t) => t.message === text && t.type === type);
    if (existing) {
      const timer = timersRef.current.get(existing.id);
      if (timer) window.clearTimeout(timer);
      if (duration > 0) {
        timersRef.current.set(
          existing.id,
          window.setTimeout(() => dismiss(existing.id), duration)
        );
      }
      setToasts((list) => list.map((t) => (t.id === existing.id ? { ...t, duration, title } : t)));
      return existing.id;
    }

    // Drop the oldest so the stack never runs off screen.
    setToasts((list) => {
      const overflow = list.slice(0, Math.max(0, list.length - (MAX_VISIBLE - 1)));
      overflow.forEach((t) => {
        const timer = timersRef.current.get(t.id);
        if (timer) window.clearTimeout(timer);
        timersRef.current.delete(t.id);
      });
      return [...overflow, { id, message: text, type, title, duration }];
    });

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
  }, [celebrate, dismiss, toasts]);

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
