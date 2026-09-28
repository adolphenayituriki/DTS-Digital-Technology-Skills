// Small in-memory fixed-window limiter. One Map per module instance, which is
// fine for the single-process deployment this runs on: a multi-process host
// would need Redis or equivalent, otherwise each process keeps its own budget.
export const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  const check = (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return { allowed: true, retryAfter: 0 };
    }
    entry.count += 1;
    if (entry.count > max) {
      return { allowed: false, retryAfter: Math.ceil((windowMs - (now - entry.start)) / 1000) };
    }
    return { allowed: true, retryAfter: 0 };
  };

  // Expire stale buckets so the Map cannot grow without bound on a public
  // endpoint. unref() keeps the timer from holding the process open.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return { check, message };
};
