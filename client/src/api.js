const API_URL = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('dts_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default apiFetch;
