/**
 * AuthContext.jsx
 * Holds the logged-in user and the JWT for the whole app.
 *
 * The token lives in localStorage so a refresh keeps the session. On boot we
 * re-validate it against GET /auth/me, because a token can be revoked or
 * expired server-side even though it is still sitting in the browser.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../api/authService';
import { getToken, setToken } from '../api/client';
import { ROLES, STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

function readCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  // Start from the cached user so the UI does not flash a login screen on reload.
  const [user, setUser] = useState(readCachedUser);
  const [booting, setBooting] = useState(true);

  const applySession = useCallback((token, nextUser) => {
    setToken(token);
    cacheUser(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    cacheUser(null);
    setUser(null);
  }, []);

  /* Validate the stored token once at startup. */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!getToken()) {
        logout();
        setBooting(false);
        return;
      }
      try {
        const me = await authService.fetchCurrentUser();
        if (!cancelled) {
          cacheUser(me);
          setUser(me);
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  /* The axios/mock layer fires this when any call returns 401. */
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('pms:unauthorised', handler);
    return () => window.removeEventListener('pms:unauthorised', handler);
  }, [logout]);

  const login = useCallback(
    async (userId, password) => {
      const { token, user: nextUser } = await authService.login(userId, password);
      applySession(token, nextUser);
      return nextUser;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const { token, user: nextUser } = await authService.register(payload);
      applySession(token, nextUser);
      return nextUser;
    },
    [applySession]
  );

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      login,
      register,
      logout,
    }),
    [user, booting, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
