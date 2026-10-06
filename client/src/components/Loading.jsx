import React from 'react';

// The single place the app renders "we are still waiting".
//
// Before this existed there were 34 hand-written copies of the same
// `<div className="loading"><div className="spinner" />Loading...</div>` markup
// across 25 files, plus one page that used a lucide Loader2 icon instead. They
// drifted: some had a label, some did not, one used a different spinner, and
// none of them announced the pending state to a screen reader.
//
// Use it whenever a fetch is in flight:
//
//   {loading ? <Loading label="Loading applications..." /> : ...}
//
// The rendered markup and class names are unchanged from the markup this
// replaces, so no CSS moved - only the duplication did.

export default function Loading({ label = 'Loading...', className = '' }) {
  return (
    <div
      className={`loading ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

// The in-flight state for a table body.
//
// This is deliberately not <Loading />. Collapsing a table to a centred spinner
// while it refetches throws away the page's layout and, worse, reads as
// "finished, nothing here" the moment the rows go - which is how a failed
// request ends up rendering as an empty list with no error. Shaped rows keep the
// columns visible and make it obvious the table is mid-refresh.
export function TableLoading({ rows = 5, cols = 4, label = 'Loading...' }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="skeleton-row">
          {Array.from({ length: cols }, (_, col) => (
            <td key={col}>
              <span className="skeleton-bar" style={{ width: `${45 + ((row * 7 + col * 13) % 45)}%` }} />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only">
        <td colSpan={cols} role="status" aria-live="polite" aria-busy="true">{label}</td>
      </tr>
    </>
  );
}

// The in-flight state for any panel that is not a table: stat cards, detail
// panes, lists. Wraps the content it replaces in a busy landmark so assistive
// tech knows the region is refreshing rather than final.
export function LoadingPanel({ label = 'Loading...', className = '', children }) {
  return (
    <div className={`loading-panel ${className}`.trim()} aria-busy="true">
      {children || <Loading label={label} />}
    </div>
  );
}
