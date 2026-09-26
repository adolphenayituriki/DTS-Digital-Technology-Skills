const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://dts-digital-technology-skills.onrender.com/api'
    : '/api');

export { API_URL };

export const TOKEN_KEY = 'dts_token';
export const STUDENT_TOKEN_KEY = 'dts_student_token';
export const STUDENT_KEY = 'dts_student';

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

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token =
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(STUDENT_TOKEN_KEY);
  const hasBody = options.body != null;
  const headers = { ...options.headers };
  if (hasBody && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, method, headers });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 401 || res.status === 403) {
    // Session is no longer valid - drop the stale credentials so the app
    // doesn't keep retrying with a dead token.
    const message = await readError(res);
    const error = new Error(message);
    error.status = res.status;
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
  return JSON.parse(text);
}

export function getApiOrigin() {
  return API_URL.replace(/\/api\/?$/, '');
}

export default apiFetch;
