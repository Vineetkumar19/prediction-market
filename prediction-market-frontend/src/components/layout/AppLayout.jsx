/**
 * AppLayout.jsx
 * The shell every signed-in screen renders inside.
 *
 * It also owns the single WebSocket connection for the whole app: one socket,
 * many listeners. When a frame arrives it shows a toast, refreshes the wallet
 * and re-fetches notifications, then broadcasts a window event so whichever
 * page is open can re-sync itself over REST.
 */

import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import useWebSocket from '../../hooks/useWebSocket';
import { useToast } from '../../context/ToastContext';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import * as notificationService from '../../api/notificationService';
import { WS_EVENT_COPY } from '../../utils/constants';

export default function AppLayout() {
  const { user, isAuthenticated } = useAuth();
  const { refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await notificationService.fetchNotifications();
      setUnread(list.filter((n) => !n.read).length);
    } catch {
      /* a failed badge count is not worth bothering the user about */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread, location.pathname]);

  /* ---- live updates ------------------------------------------------------ */

  const handleSocketFrame = useCallback(
    (frame) => {
      if (!frame) return;

      // In mock mode every user shares one browser, so ignore frames for others.
      if (frame.userId && user?.id && frame.userId !== user.id) return;

      // Reconnect nudge: no toast, just re-sync everything.
      if (frame.event === 'SOCKET_RECONNECTED' || frame.silent) {
        refreshWallet();
        loadUnread();
        window.dispatchEvent(new CustomEvent('pms:resync'));
        return;
      }

      const copy = WS_EVENT_COPY[frame.event] || { title: frame.title || 'Update', tone: 'info' };
      toast.push({
        tone: copy.tone,
        title: frame.title || copy.title,
        message: frame.message,
      });

      refreshWallet();
      loadUnread();

      // The open page listens for this and re-fetches its own data. The socket
      // is only a nudge - REST always supplies the authoritative numbers.
      window.dispatchEvent(new CustomEvent('pms:resync', { detail: frame }));
    },
    [toast, refreshWallet, loadUnread, user?.id]
  );

  useWebSocket(handleSocketFrame, { enabled: isAuthenticated });

  return (
    <div className="app-shell">
      <Navbar unreadCount={unread} />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
