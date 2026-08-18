/**
 * ToastContext.jsx
 * App-wide transient messages. Every screen and every WebSocket event uses
 * `toast.success(...)`, `toast.error(...)` etc. instead of alert().
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastStack from '../components/common/ToastStack';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ tone = 'info', title, message, duration = DEFAULT_DURATION }) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, tone, title, message }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, message) => push({ tone: 'success', title, message }),
      error: (title, message) => push({ tone: 'error', title, message, duration: 7000 }),
      info: (title, message) => push({ tone: 'info', title, message }),
      warning: (title, message) => push({ tone: 'warning', title, message, duration: 7000 }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
