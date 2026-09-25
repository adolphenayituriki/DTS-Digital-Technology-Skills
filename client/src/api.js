const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://dts-digital-technology-skills.onrender.com/api'
    : '/api');

export { API_URL };

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

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('dts_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default apiFetch;
