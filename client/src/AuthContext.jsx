import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import apiFetch from './api';

export const AuthContext = createContext(null);

const readToken = () => {
  try {
    return localStorage.getItem('dts_token');
  } catch {
    return null;
  }
};

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
  // With a token already in storage the cached profile is good enough to render
  // immediately, so a hard refresh on a dashboard does not sit behind the
  // round-trip to /auth/me (which can be slow when the API is cold). The
  // revalidation below still runs and clears the session if the token is dead.
  const [ready, setReady] = useState(() => !!readToken());

  useEffect(() => {
    let cancelled = false;
    const token = readToken();
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
