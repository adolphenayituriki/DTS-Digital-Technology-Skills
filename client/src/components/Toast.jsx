import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TITLES = { success: 'Success', error: 'Something went wrong', info: 'Heads up' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'success', opts = {}) => {
    const id = ++idRef.current;
    const duration = opts.duration ?? (type === 'error' ? 5200 : 4000);
    setToasts((list) => [...list, { id, message, type, title: opts.title || TITLES[type], duration }]);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    notify: push,
    success: (m, o) => push(m, 'success', o),
    error: (m, o) => push(m, 'error', o),
    info: (m, o) => push(m, 'info', o),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
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
