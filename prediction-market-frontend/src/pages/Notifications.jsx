/**
 * Notifications.jsx
 * The stored copy of every message the WebSocket pushed - partial match, full
 * match, refund, cancellation, result and settlement.
 *
 * Toasts disappear; this page is where a user checks what they missed while
 * the app was closed.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { LoadingBlock } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import * as notificationService from '../api/notificationService';
import { formatRelative, formatDateTime } from '../utils/format';
import { WS_EVENT } from '../utils/constants';
import {
  IconAlert,
  IconBell,
  IconCheckCircle,
  IconClock,
  IconCoins,
  IconInfo,
  IconXCircle,
} from '../components/common/Icons';

const EVENT_STYLE = {
  [WS_EVENT.PARTIAL_MATCH]: { icon: <IconClock size={19} />, bg: '#fdf0c9', fg: 'var(--yellow-700)' },
  [WS_EVENT.FULL_MATCH]: { icon: <IconCheckCircle size={19} />, bg: 'var(--green-50)', fg: 'var(--green-600)' },
  [WS_EVENT.NEW_OPPONENT_MATCHED]: { icon: <IconCheckCircle size={19} />, bg: 'var(--green-50)', fg: 'var(--green-600)' },
  [WS_EVENT.UNMATCHED_REFUND]: { icon: <IconCoins size={19} />, bg: 'var(--blue-50)', fg: 'var(--blue-500)' },
  [WS_EVENT.CONTEST_CANCELLED]: { icon: <IconXCircle size={19} />, bg: 'var(--red-50)', fg: 'var(--red-600)' },
  [WS_EVENT.CONTEST_LOCKED]: { icon: <IconAlert size={19} />, bg: 'var(--surface-alt)', fg: 'var(--ink-500)' },
  [WS_EVENT.CONTEST_RESOLVED]: { icon: <IconInfo size={19} />, bg: 'var(--blue-50)', fg: 'var(--blue-500)' },
  [WS_EVENT.SETTLEMENT_COMPLETED]: { icon: <IconCheckCircle size={19} />, bg: 'var(--green-50)', fg: 'var(--green-600)' },
  [WS_EVENT.WALLET_UPDATED]: { icon: <IconCoins size={19} />, bg: '#fdf0c9', fg: 'var(--yellow-700)' },
};

const DEFAULT_STYLE = { icon: <IconBell size={19} />, bg: 'var(--surface-alt)', fg: 'var(--ink-500)' };

export default function Notifications() {
  const { data: notifications, loading, reload } = useAsync(
    notificationService.fetchNotifications,
    []
  );

  useEffect(() => {
    const handler = () => reload().catch(() => {});
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [reload]);

  const unread = (notifications || []).filter((n) => !n.read).length;

  const markAll = async () => {
    await notificationService.markAllRead();
    reload();
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Match updates, refunds, cancellations and results - kept here so you can read them
            later.
          </p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll}>
            Mark all as read ({unread})
          </Button>
        )}
      </div>

      {loading && !notifications ? (
        <LoadingBlock label="Loading notifications..." />
      ) : !notifications?.length ? (
        <EmptyState
          icon={<IconBell size={24} />}
          title="No notifications yet"
          text="When an opponent takes the other side of your entry, or a contest is refunded or settled, the message will appear here."
          actionLabel="Browse contests"
          actionTo="/"
        />
      ) : (
        <div className="stack stack-3">
          {notifications.map((n) => {
            const style = EVENT_STYLE[n.event] || DEFAULT_STYLE;
            const body = (
              <>
                <div className="notif__icon" style={{ background: style.bg, color: style.fg }}>
                  {style.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span className="notif__title">{n.title}</span>
                    {!n.read && <Badge tone="yellow">New</Badge>}
                  </div>
                  <p className="notif__text">{n.message}</p>
                  <div className="notif__time" title={formatDateTime(n.createdAt)}>
                    {formatRelative(n.createdAt)}
                  </div>
                </div>
              </>
            );

            return n.contestId ? (
              <Link
                key={n.id}
                to={`/contest/${n.contestId}`}
                className={`notif ${n.read ? '' : 'is-unread'}`}
              >
                {body}
              </Link>
            ) : (
              <div key={n.id} className={`notif ${n.read ? '' : 'is-unread'}`}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
