/**
 * WalletContext.jsx
 * One source of truth for the token balance so the navbar pill, the wallet
 * page and the entry panel can never disagree with each other.
 *
 * `refresh()` is called after every action that can move tokens, and by the
 * WebSocket listener whenever the server says the wallet changed.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as walletService from '../api/walletService';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

const EMPTY = { available: 0, locked: 0, total: 0 };

export function WalletProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false); // drives the highlight animation
  const previousTotal = useRef(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWallet(EMPTY);
      return EMPTY;
    }
    setLoading(true);
    try {
      const next = await walletService.fetchWallet();
      setWallet(next);

      // Flash the navbar pill when the balance actually changed.
      if (previousTotal.current !== null && previousTotal.current !== next.available) {
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      }
      previousTotal.current = next.available;
      return next;
    } catch {
      return EMPTY;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ wallet, loading, flash, refresh }),
    [wallet, loading, flash, refresh]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
