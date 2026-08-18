/**
 * AdminTransactions.jsx
 * The global ledger - every token movement by every player, newest first.
 * This is the screen you use to answer "where did those tokens go".
 */

import { useMemo, useState } from 'react';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import * as adminService from '../../api/adminService';
import { formatDateShort, formatSigned, formatTokens } from '../../utils/format';
import { TX_TYPE_META } from '../../utils/constants';
import { IconHistory, IconSearch } from '../../components/common/Icons';

export default function AdminTransactions() {
  const { data: transactions, loading } = useAsync(adminService.fetchAdminTransactions, []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = transactions || [];
    if (!q) return list;
    return list.filter(
      (t) =>
        String(t.user).toLowerCase().includes(q) ||
        String(t.type).toLowerCase().includes(q) ||
        String(t.contestTitle || '').toLowerCase().includes(q)
    );
  }, [transactions, query]);

  const totals = useMemo(() => {
    const list = transactions || [];
    const credited = list.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const debited = list.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0);
    return { credited, debited, count: list.length };
  }, [transactions]);

  if (loading && !transactions) return <LoadingBlock label="Loading ledger..." />;

  return (
    <div className="stack stack-5" style={{ gap: 'var(--s-5)' }}>
      <div className="admin-stat-grid" style={{ marginBottom: 0 }}>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatTokens(totals.count)}</div>
          <div className="admin-stat__label">Ledger entries</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value text-yes">{formatSigned(totals.credited)}</div>
          <div className="admin-stat__label">Total credited</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value text-no">{formatSigned(totals.debited)}</div>
          <div className="admin-stat__label">Total debited</div>
        </div>
      </div>

      <div className="search" style={{ maxWidth: 420 }}>
        <span className="search__icon">
          <IconSearch />
        </span>
        <input
          className="input"
          placeholder="Filter by user, type or contest..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter transactions"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconHistory size={24} />} title="No matching transactions" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Contest</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const meta = TX_TYPE_META[t.type] || { label: t.type, tone: 'neutral' };
                  return (
                    <tr key={t.id}>
                      <td className="mono small nowrap">{formatDateShort(t.createdAt)}</td>
                      <td className="mono small">@{t.user}</td>
                      <td>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="small">{t.contestTitle || <span className="muted">-</span>}</td>
                      <td className="small muted">{t.note || '-'}</td>
                      <td className={`num ${t.amount > 0 ? 'amount-pos' : 'amount-neg'}`}>
                        {formatSigned(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="record-list">
            {filtered.map((t) => {
              const meta = TX_TYPE_META[t.type] || { label: t.type, tone: 'neutral' };
              return (
                <div className="record" key={t.id}>
                  <div className="record__top">
                    <div>
                      <div className="mono small bold">@{t.user}</div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <span className={`record__amount ${t.amount > 0 ? 'amount-pos' : 'amount-neg'}`}>
                      {formatSigned(t.amount)}
                    </span>
                  </div>
                  {t.contestTitle && <div className="small">{t.contestTitle}</div>}
                  <div className="tiny muted mt-2">{formatDateShort(t.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
