const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://dts-digital-technology-skills.onrender.com/api'
    : '/api');

export { API_URL };

export const TOKEN_KEY = 'dts_token';
export const STUDENT_TOKEN_KEY = 'dts_student_token';
export const STUDENT_KEY = 'dts_student';
export const USER_KEY = 'dts_user';

// Fired when the server rejects the token we sent, so AuthContext can drop its
// in-memory user too. A DOM event rather than a direct call, because api.js is
// imported *by* AuthContext and importing back would be circular.
export const SESSION_EXPIRED_EVENT = 'dts:session-expired';

import { beginBusy, endBusy } from './busy';

// Simple event emitter for cross-component refresh signals
const refreshListeners = new Map();
export function onFinanceRefresh(callback) {
  const id = Symbol('refresh');
  refreshListeners.set(id, callback);
  return () => refreshListeners.delete(id);
}
export function triggerFinanceRefresh() {
  refreshListeners.forEach((cb) => cb());
}

export function setStudentSession(student) {
  const { token, ...profile } = student || {};
  sessionStorage.setItem(STUDENT_KEY, JSON.stringify(profile));
  if (token) sessionStorage.setItem(STUDENT_TOKEN_KEY, token);
}

export function clearStudentSession() {
  sessionStorage.removeItem(STUDENT_KEY);
  sessionStorage.removeItem(STUDENT_TOKEN_KEY);
}

export function getStudentSession() {
  try {
    const raw = sessionStorage.getItem(STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Drop the credential the server just rejected, so it is not resent on every
// later request until a full page reload happens to clear it. Only the store
// that actually holds `token` is touched, and only while it still holds that
// exact value, so a login that lands mid-request is never wiped.
function dropRejectedToken(token) {
  try {
    if (localStorage.getItem(TOKEN_KEY) === token) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    /* storage unavailable: nothing persisted to clear */
  }
  try {
    if (sessionStorage.getItem(STUDENT_TOKEN_KEY) === token) {
      clearStudentSession();
    }
  } catch {
    /* storage unavailable: nothing persisted to clear */
  }
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

// Server errors arrive as { message } JSON, a bare string, or an HTML error
// page. Surface something a human can read in a toast.
async function readError(res) {
  const fallback = `Request failed (${res.status})`;
  let body;
  try {
    body = await res.text();
  } catch {
    return fallback;
  }
  if (!body) return fallback;

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === 'string') return parsed;
    if (parsed?.message) {
      return Array.isArray(parsed.message)
        ? parsed.message.join(', ')
        : String(parsed.message);
    }
    if (parsed?.error) return String(parsed.error);
  } catch {
    // not JSON
  }

  if (/^\s*<(!doctype|html)/i.test(body)) return fallback;
  return body.slice(0, 300);
}

// The busy session spans the whole call - headers, body read and error parsing
// included - so the indicator stays up until the caller actually has its data.
// `busy: false` opts a request out for anything long-lived or purely cosmetic.
async function apiFetch(path, options = {}) {
  const { busy = true, ...rest } = options;
  if (!busy) return apiFetchRaw(path, rest);
  beginBusy();
  try {
    return await apiFetchRaw(path, rest);
  } finally {
    endBusy();
  }
}

async function apiFetchRaw(path, options = {}) {
  const { anonymous, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const token =
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(STUDENT_TOKEN_KEY);
  const hasBody = rest.body != null;
  const headers = { ...rest.headers };
  if (hasBody && !(rest.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, method, headers });
  } catch (error) {
    // A cancelled request is not a failed one. It arrives here as an AbortError
    // and used to be reported as "Cannot reach the server", which is both wrong
    // and the reason a superseded request's caller could not tell the difference.
    if (error?.name === 'AbortError' || rest.signal?.aborted) throw error;
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  // 401 and 403 mean different things and must not be treated alike. The
  // server sends 401 only when the token itself is unusable (missing, expired,
  // revoked, or the wrong kind), so that is the one case where the credential
  // is genuinely dead. 403 means the token is fine and the role simply is not
  // allowed, which happens constantly in normal use - a trainer opening a
  // route outside their assigned intakes, say - and logging the user out over
  // it would be wrong.
  //
  // `anonymous` opts a request out entirely, for the two endpoints where a 401
  // is a validation result rather than a session problem: POST /auth/login and
  // POST /students/login both answer 401 for bad credentials, and without this
  // a signed-in user who mistypes a password would be logged out by their own
  // failed login attempt.
  if (res.status === 401) {
    const message = await readError(res);
    if (!anonymous && token) dropRejectedToken(token);
    const error = new Error(message);
    error.status = 401;
    throw error;
  }

  if (res.status === 403) {
    const error = new Error(await readError(res));
    error.status = 403;
    throw error;
  }

  if (!res.ok) {
    const error = new Error(await readError(res));
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A 2xx carrying something that is not JSON - typically an HTML page from
    // a proxy or a captive portal. Report it as the failed request it is rather
    // than letting a raw SyntaxError escape with no status and no context.
    throw new Error(`Unexpected response from the server (${res.status}).`);
  }
}

export function getApiOrigin() {
  return API_URL.replace(/\/api\/?$/, '');
}

export default apiFetch;
