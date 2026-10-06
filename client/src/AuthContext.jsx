import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import apiFetch, { SESSION_EXPIRED_EVENT, TOKEN_KEY, USER_KEY } from './api';

export const AuthContext = createContext(null);

// These two run during the first render, which now also happens on the server
// during prerendering. `localStorage` is absent there, so the check has to be
// explicit rather than left to try/catch - a thrown ReferenceError would land in
// the catch below, whose own localStorage call would then throw again and take
// the whole render down with it.
const hasStorage = () => typeof localStorage !== 'undefined';

const readToken = () => {
  if (!hasStorage()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const readUser = () => {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* private mode: nothing to clear */
    }
    return null;
  }
};

export function AuthProvider({ children }) {
  // Both start empty, on the server and on the client, and that is deliberate.
  //
  // The public pages are prerendered, so their markup in #root was produced with
  // no session. Reading localStorage during the first client render - which is
  // what this used to do - made a signed-in visitor's first paint disagree with
  // that markup (the navbar swaps "Log In" for an avatar), and React responds to
  // a hydration mismatch by discarding the server tree. The prerendered HTML was
  // then thrown away on exactly the page view that had most to gain from it.
  //
  // So storage is read in the effect below instead. `ready` is the flag that says
  // "we now know who this is"; anything auth-dependent renders its wait state
  // until it flips, which is also what stops a flash of the signed-out navbar.
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  // Distinguishes "still revalidating" from "settled". `ready` covers the first
  // paint; this covers the background check that runs afterwards, so a session
  // that cannot be confirmed can report itself instead of silently signing out.
  const [revalidating, setRevalidating] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const token = readToken();
    if (!token) {
      // Nothing stored: this is settled immediately, not a pending state.
      try {
        localStorage.removeItem(USER_KEY);
      } catch {
        /* private mode: nothing to clear */
      }
      setUser(null);
      setReady(true);
      return undefined;
    }

    // Paint from the cached copy so a reload does not blank the navbar, then
    // confirm it against the server.
    setUser(readUser());
    setReady(true);
    setRevalidating(true);
    setSessionError('');

    apiFetch('/auth/me')
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      })
      .catch((err) => {
        if (cancelled) return;
        // apiFetch clears storage itself on a 401, so only a transport failure
        // or a server error lands here with the token still present. Those are
        // not a logout - keeping the cached session and saying so beats bouncing
        // the user to the login page with no explanation.
        const status = err?.status;
        if (status === 401 || status === 403) {
          try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          } catch {
            /* private mode: nothing to clear */
          }
          setUser(null);
          return;
        }
        setSessionError(err?.message || 'Could not verify your session.');
      })
      .finally(() => {
        if (cancelled) return;
        setRevalidating(false);
      });

    return () => { cancelled = true; };
  }, []);

  // A 401 on any later request means the token died mid-session, after the
  // check above already succeeded. apiFetch has cleared it from storage by the
  // time this fires; drop the cached user so the UI stops rendering a session
  // the server will no longer honour, and let RequireRole redirect.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const setSession = useCallback((token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setSessionError('');
    setRevalidating(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setSessionError('');
  }, []);

  // Merge a partial profile patch into the cached session. Used after
  // PUT /auth/me so the avatar in the navbar, the staff sidebar headers and
  // this page all update from the one response instead of each re-fetching.
  const updateUser = useCallback((patch) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(next));
      } catch {
        /* private mode: keep the in-memory value, just skip the cache */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, isLoggedIn: !!user, ready, revalidating, sessionError, setSession, logout, updateUser }),
    [user, ready, revalidating, sessionError, setSession, logout, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
