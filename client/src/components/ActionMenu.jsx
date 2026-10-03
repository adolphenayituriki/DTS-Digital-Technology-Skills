import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * Row actions behind one trigger, so a table row stays one line tall instead of
 * carrying three or four buttons.
 *
 * The panel is rendered in a portal and positioned `fixed` rather than
 * absolutely inside the row. Both of the obvious alternatives break here: an
 * absolute panel is clipped by the table's `overflow-x: auto` on narrow screens,
 * and without a portal a `fixed` panel is still captured by any ancestor that
 * has a transform, which the hover lifts on cards and rows both introduce.
 */
export default function ActionMenu({ label = 'Row actions', items = [], minWidth = 200 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Measured from the trigger rather than styled into place, and flipped above
  // the row when there is not enough room below - the last rows of a table are
  // the ones nearest the bottom of the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return undefined;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = minWidth;
    const height = items.length * 36 + 10;
    const gap = 6;
    const edge = 8;

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - edge) {
      top = rect.top - height - gap;
    }
    let left = rect.right - width;
    left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
    top = Math.max(edge, top);

    setPos({ top, left, width });
  }, [open, items.length, minWidth]);

  // Anything that would leave the menu detached from its row closes it: a click
  // elsewhere, Escape, a scroll (the table scrolls sideways on a phone), or a
  // resize that moves the row.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      close();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };
    const onReflow = () => close();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReflow);
    // Capture phase so a scroll on any inner container counts, not just the page.
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, close]);

  // Move focus into the menu so it is reachable from the keyboard, and so the
  // next Tab lands on the items rather than back at the top of the table.
  useEffect(() => {
    if (open) panelRef.current?.querySelector('button:not(:disabled)')?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(event) => {
          // The row itself is clickable on several of these tables.
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="action-menu-panel"
          role="menu"
          aria-label={label}
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`action-menu-item tone-${item.tone || 'slate'}`}
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                close();
                item.onSelect?.();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
