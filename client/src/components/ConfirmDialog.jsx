import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && !loading) onConfirm();
    };
    window.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="dialog-close" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>
        <div className="dialog-icon">
          <AlertTriangle size={24} />
        </div>
        <h3 id="dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-outline btn-sm" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className="btn btn-danger btn-sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}