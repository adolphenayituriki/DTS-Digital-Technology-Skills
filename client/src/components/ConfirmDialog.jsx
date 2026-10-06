import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Dialog from './Dialog';

// A destructive-action confirmation.
//
// Built on Dialog so it inherits the same overlay, card, icon badge and footer as
// every other modal. The compact variant keeps the centred, icon-on-top layout a
// short yes/no question wants, rather than stretching a one-line question across
// a wide card.
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loadingLabel = 'Working...',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open, loading]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      icon={<AlertTriangle size={22} />}
      iconClassName="is-danger"
      className="dialog-card-compact"
      labelledBy="dialog-title"
      footer={
        <>
          <button className="btn btn-outline btn-sm" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className="btn btn-danger btn-sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}