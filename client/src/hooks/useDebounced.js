import { useEffect, useState } from 'react';

// Keeps a fast-typing field out of the request path.
//
// The search boxes on the trainer, finance and admin student tables are bound
// straight to the filter state that their fetch effect depends on, so every
// keystroke used to fire a request. On the finance balances table each one of
// those requests is a full rollup - all students, all their transactions and all
// intake titles - behind an unindexed regex, so an eight-character registration
// number meant eight full-table scans.
//
// This splits the two concerns: the input stays instant on `value`, and only the
// debounced copy reaches the effect that fetches.
//
//   const [query, setQuery] = useDebounced(searchText, 300);
//   useEffect(() => { ... }, [query]);
//
// The trailing edge only, deliberately. This is a filter over a table the user is
// already looking at, so there is nothing to show while they are still typing -
// an early result would just be replaced a moment later and make the row jump.

export default function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
