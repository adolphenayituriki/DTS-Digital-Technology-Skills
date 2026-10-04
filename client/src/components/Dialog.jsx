import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// The single dialog shell for the whole app.
//
// Every modal used to hand-roll the same overlay, card, close button, icon badge,
// title and footer, in eight places. They drifted: some got the blurred scrim,
// some did not, the icon badge was sometimes missing, and the footer was a row of
// buttons with no separation from the body. This is that structure once.
//
// `className` is for cards that need their own sizing or a coloured header - the
// application detail panel and the course manager pass `.app-detail` and
// `.course-modal` through, so nothing that depends on those styles breaks.
export default function Dialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconClassName = '',
  className = '',
  children,
  footer,
  labelledBy,
}) {
  const cardRef = useRef(null);
  const titleId = labelledBy || 'dialog-title';

  // Escape closes, Tab is trapped inside, and the page behind cannot scroll.
  // Without the scroll lock a long modal on a phone lets the page behind it slide
  // under your finger, which reads as the modal having closed.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = cardRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus in so the keyboard and screen reader start inside the dialog
    // rather than somewhere behind it.
    cardRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        className={`dialog-card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {(title || icon) && (
          <header className="dialog-head">
            {icon && <span className={`dialog-icon ${iconClassName}`.trim()}>{icon}</span>}
            <div className="dialog-head-text">
              {title && <h3 id={titleId}>{title}</h3>}
              {subtitle && <p className="dialog-sub">{subtitle}</p>}
            </div>
          </header>
        )}

        <div className="dialog-body">{children}</div>

        {footer && <footer className="dialog-actions">{footer}</footer>}
      </div>
    </div>
  );
}