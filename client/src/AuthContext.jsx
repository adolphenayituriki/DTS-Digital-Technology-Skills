import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import apiFetch from './api';

export const AuthContext = createContext(null);

const readUser = () => {
  try {
    const raw = localStorage.getItem('dts_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('dts_user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('dts_token');
    if (!token) {
      localStorage.removeItem('dts_user');
      setUser(null);
      setReady(true);
      return undefined;
    }
    apiFetch('/auth/me')
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        localStorage.setItem('dts_user', JSON.stringify(data));
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('dts_token');
        localStorage.removeItem('dts_user');
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
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

  const value = useMemo(() => ({ user, isLoggedIn: !!user, ready, setSession, logout }), [user, ready, setSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
