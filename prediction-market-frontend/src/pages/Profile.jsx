/**
 * Profile.jsx
 * Read-only account details plus logout.
 *
 * Nothing here is editable by design: a player cannot change their User ID,
 * their name or their password. If credentials are lost the account cannot be
 * recovered and a new one must be created - which is exactly why the reminder
 * below is worded so firmly.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatTokens, initialsOf } from '../utils/format';
import { ROLES } from '../utils/constants';
import { IconAlert, IconCheck, IconCopy, IconLogout, IconShield } from '../components/common/Icons';

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const { wallet } = useWallet();
  const toast = useToast();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.info('Copy failed', 'Select the User ID and copy it manually.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="container page">
      <h1 className="page-title" style={{ marginBottom: 'var(--s-5)' }}>
        Profile
      </h1>

      {/* ---- header ---- */}
      <div className="profile-header">
        <div className="avatar avatar--lg">{initialsOf(user?.name || user?.userId)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="profile-name">{user?.name}</div>
          <div className="profile-id">
            @{user?.userId}
            <button
              type="button"
              className="copy-btn"
              onClick={copyUserId}
              aria-label="Copy User ID"
              title="Copy User ID"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </button>
          </div>
          {isAdmin && (
            <span className="badge badge--yellow" style={{ marginTop: 8 }}>
              <IconShield size={12} /> Administrator
            </span>
          )}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="balance-card__label">Available tokens</div>
          <div className="mono bold" style={{ fontSize: 'var(--fs-2xl)' }}>
            {formatTokens(wallet.available)}
          </div>
        </div>
      </div>

      <div className="stack stack-6">
        {/* ---- account details (read only) ---- */}
        <section className="card">
          <div className="card-head">
            <h3>Account details</h3>
          </div>
          <div className="card-pad" style={{ paddingBlock: 0 }}>
            <div className="info-row">
              <span className="info-row__label">User ID</span>
              <span className="info-row__value mono">{user?.userId}</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Name</span>
              <span className="info-row__value">{user?.name}</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Password</span>
              <span className="info-row__value mono muted">••••••••</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Role</span>
              <span className="info-row__value">
                {user?.role === ROLES.ADMIN ? 'Administrator' : 'Player'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Member since</span>
              <span className="info-row__value small">{formatDateTime(user?.createdAt)}</span>
            </div>
          </div>
        </section>

        {/* ---- the credential warning ---- */}
        <div className="remember-note" style={{ marginBottom: 0 }}>
          <span style={{ color: 'var(--yellow-700)', flexShrink: 0 }}>
            <IconAlert size={18} />
          </span>
          <span>
            <strong>Keep your User ID and password safe, permanently.</strong>
            This account has no email or phone number, and your password cannot be changed or reset
            by anyone. If you lose it, the account cannot be recovered and you will have to create a
            new one.
          </span>
        </div>

        {/* ---- session ---- */}
        <section className="card card-pad">
          <h3 className="section-title">Session</h3>
          <p className="small muted" style={{ marginBottom: 'var(--s-4)' }}>
            Logging out clears your saved session on this device. Your tokens and history are kept
            on the server.
          </p>
          <Button variant="dangerGhost" icon={<IconLogout size={16} />} onClick={handleLogout}>
            Log out
          </Button>
        </section>
      </div>
    </div>
  );
}
