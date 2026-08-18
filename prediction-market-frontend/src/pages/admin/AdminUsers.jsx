/**
 * AdminUsers.jsx
 * Search a player by User ID and credit (or debit) virtual tokens, exactly as
 * described in spec section 14: search -> enter amount -> confirm -> wallet
 * credited -> ADMIN_CREDIT transaction -> audit log entry.
 */

import { useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import * as adminService from '../../api/adminService';
import { formatTokens, initialsOf } from '../../utils/format';
import { ROLES } from '../../utils/constants';
import { IconAlert, IconSearch, IconUsers } from '../../components/common/Icons';

const PRESETS = [500, 1000, 2500, 5000];

export default function AdminUsers() {
  const { data: users, loading, reload } = useAsync(adminService.fetchAdminUsers, []);
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState(5000);
  const [reason, setReason] = useState('Friend-circle allocation');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users || [];
    return (users || []).filter(
      (u) => u.userId.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [users, query]);

  const submit = async () => {
    setSaving(true);
    try {
      await adminService.adjustTokens(target.id, amount, reason);
      toast.success(
        'Wallet updated',
        `${amount > 0 ? '+' : ''}${formatTokens(amount)} tokens for @${target.userId}.`
      );
      setTarget(null);
      reload();
    } catch (err) {
      toast.error('Could not update wallet', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !users) return <LoadingBlock label="Loading users..." />;

  return (
    <div className="stack stack-5" style={{ gap: 'var(--s-5)' }}>
      <div className="search" style={{ maxWidth: 420 }}>
        <span className="search__icon">
          <IconSearch />
        </span>
        <input
          className="input"
          placeholder="Search by User ID or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconUsers size={24} />} title="No users match that search" />
      ) : (
        <>
          {/* ---- wide screens ---- */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th className="num">Available</th>
                  <th className="num">Locked</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <span
                          className="avatar"
                          style={{ width: 32, height: 32, fontSize: 12, cursor: 'default' }}
                        >
                          {initialsOf(u.name)}
                        </span>
                        <span className="bold small">{u.name}</span>
                      </div>
                    </td>
                    <td className="mono small">@{u.userId}</td>
                    <td>
                      <Badge tone={u.role === ROLES.ADMIN ? 'yellow' : 'neutral'}>{u.role}</Badge>
                    </td>
                    <td className="num">{formatTokens(u.available)}</td>
                    <td className="num muted">{formatTokens(u.locked)}</td>
                    <td className="num bold">{formatTokens(u.total)}</td>
                    <td>
                      <Button
                        size="sm"
                        onClick={() => {
                          setTarget(u);
                          setAmount(5000);
                          setReason('Friend-circle allocation');
                        }}
                      >
                        Tokens
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---- phones ---- */}
          <div className="record-list">
            {filtered.map((u) => (
              <div className="record" key={u.id}>
                <div className="record__top">
                  <div>
                    <div className="bold">{u.name}</div>
                    <div className="mono small muted">@{u.userId}</div>
                  </div>
                  <Badge tone={u.role === ROLES.ADMIN ? 'yellow' : 'neutral'}>{u.role}</Badge>
                </div>
                <div className="row row-between mt-2">
                  <span className="small">
                    <span className="mono bold">{formatTokens(u.available)}</span>{' '}
                    <span className="muted">available</span> &middot;{' '}
                    <span className="mono">{formatTokens(u.locked)}</span>{' '}
                    <span className="muted">locked</span>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTarget(u);
                      setAmount(5000);
                    }}
                  >
                    Tokens
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- credit / debit ---- */}
      <Modal
        open={Boolean(target)}
        title={`Adjust tokens for @${target?.userId || ''}`}
        onClose={() => !saving && setTarget(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!amount}>
              {amount >= 0 ? 'Add' : 'Remove'} {formatTokens(Math.abs(amount))} tokens
            </Button>
          </>
        }
      >
        {target && (
          <div className="stack stack-4">
            <div className="panel">
              <div className="calc-row">
                <span className="calc-row__label">Player</span>
                <span className="calc-row__value">{target.name}</span>
              </div>
              <div className="calc-row">
                <span className="calc-row__label">Available now</span>
                <span className="calc-row__value">{formatTokens(target.available)}</span>
              </div>
              <div className="calc-row">
                <span className="calc-row__label">Locked</span>
                <span className="calc-row__value">{formatTokens(target.locked)}</span>
              </div>
              <div className="calc-row calc-row--total">
                <span className="calc-row__label">Available after</span>
                <span className="calc-row__value">
                  {formatTokens(target.available + Number(amount || 0))}
                </span>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="tokenAmount">
                Amount (use a negative number to remove tokens)
              </label>
              <input
                id="tokenAmount"
                type="number"
                className="input mono"
                value={amount}
                onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))}
              />
              <div className="quick-picks mt-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`quick-pick ${amount === p ? 'is-active' : ''}`}
                    onClick={() => setAmount(p)}
                  >
                    +{formatTokens(p)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="tokenReason">
                Reason (stored in the audit log)
              </label>
              <input
                id="tokenReason"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Friend-circle allocation"
              />
            </div>

            <div className="notice">
              <span className="notice__icon">
                <IconAlert size={16} />
              </span>
              <span className="tiny">
                This creates an ADMIN_CREDIT transaction and an audit log entry. Tokens are virtual
                and must never be sold or exchanged for money.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
