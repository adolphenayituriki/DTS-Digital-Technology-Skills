import { useState, useEffect, useCallback } from 'react';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('dts_token');
    const raw = localStorage.getItem('dts_user');
    if (token && raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem('dts_token');
        localStorage.removeItem('dts_user');
      }
    }
    setReady(true);
  }, []);

  const setSession = useCallback((token, userData) => {
    localStorage.setItem('dts_token', token);
    localStorage.setItem('dts_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dts_token');
    localStorage.removeItem('dts_user');
    setUser(null);
  }, []);

  return { user, isLoggedIn: !!user, ready, setSession, logout };
}