/**
 * History.jsx
 * Two views of the same story:
 *   - Transactions: every token movement, filterable by type
 *   - My entries:   every contest position and how it ended
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TransactionTable from '../components/wallet/TransactionTable';
import Badge from '../components/common/Badge';
import { OrderStatusBadge } from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { LoadingBlock } from '../components/common/Spinner';
import Button from '../components/common/Button';
import useAsync from '../hooks/useAsync';
import * as walletService from '../api/walletService';
import * as orderService from '../api/orderService';
import { formatDateShort, formatDateTime, formatSigned, formatTokens } from '../utils/format';
import { SIDE, SIDE_LABEL, TX_TYPE } from '../utils/constants';
import { IconChevronRight, IconHistory, IconRefresh } from '../components/common/Icons';

const TX_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'credits', label: 'Admin credits', types: [TX_TYPE.ADMIN_CREDIT, TX_TYPE.ADMIN_DEBIT] },
  { key: 'entries', label: 'Entries', types: [TX_TYPE.CONTEST_ENTRY, TX_TYPE.SIMULATED_CHARGE] },
  {
    key: 'refunds',
    label: 'Refunds',
    types: [TX_TYPE.UNMATCHED_REFUND, TX_TYPE.CONTEST_CANCEL_REFUND],
  },
  {
    key: 'results',
    label: 'Results',
    types: [TX_TYPE.SETTLEMENT_PROFIT, TX_TYPE.SETTLEMENT_LOSS, TX_TYPE.SETTLEMENT_FLAT],
  },
];

export default function History() {
  const [tab, setTab] = useState('transactions');
  const [txFilter, setTxFilter] = useState('all');

  const {
    data: transactions,
    loading: loadingTx,
    reload: reloadTx,
  } = useAsync(walletService.fetchTransactions, []);
  const { data: orders, loading: loadingOrders, reload: reloadOrders } = useAsync(
    orderService.fetchMyOrders,
    []
  );

  useEffect(() => {
    const handler = () => {
      reloadTx().catch(() => {});
      reloadOrders().catch(() => {});
    };
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [reloadTx, reloadOrders]);

  const filteredTx = useMemo(() => {
    const list = transactions || [];
    const filter = TX_FILTERS.find((f) => f.key === txFilter);
    if (!filter?.types) return list;
    return list.filter((t) => filter.types.includes(t.type));
  }, [transactions, txFilter]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">
            Every token movement and every contest you have entered, oldest at the bottom.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<IconRefresh size={15} />}
          onClick={() => {
            reloadTx();
            reloadOrders();
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="segmented mb-4" role="tablist" style={{ marginBottom: 'var(--s-5)' }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'transactions'}
          className={`segmented__btn ${tab === 'transactions' ? 'is-active' : ''}`}
          onClick={() => setTab('transactions')}
        >
          Transactions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'entries'}
          className={`segmented__btn ${tab === 'entries' ? 'is-active' : ''}`}
          onClick={() => setTab('entries')}
        >
          My entries
        </button>
      </div>

      {tab === 'transactions' ? (
        <>
          <div className="segmented mb-4" style={{ marginBottom: 'var(--s-4)' }}>
            {TX_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`segmented__btn ${txFilter === f.key ? 'is-active' : ''}`}
                onClick={() => setTxFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadingTx && !transactions ? (
            <LoadingBlock label="Loading transactions..." />
          ) : (
            <TransactionTable transactions={filteredTx} />
          )}
        </>
      ) : loadingOrders && !orders ? (
        <LoadingBlock label="Loading your entries..." />
      ) : !orders?.length ? (
        <EmptyState
          icon={<IconHistory size={24} />}
          title="You have not entered a contest yet"
          text="Open a live contest, choose BUY / YES or SELL / NO, and your entry will show up here."
          actionLabel="Browse contests"
          actionTo="/"
        />
      ) : (
        <>
          {/* ---- wide screens ---- */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contest</th>
                  <th>Side</th>
                  <th className="num">Shares</th>
                  <th className="num">Matched</th>
                  <th className="num">Paid</th>
                  <th className="num">Settled at</th>
                  <th className="num">P&amp;L</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="nowrap mono small">{formatDateShort(o.createdAt)}</td>
                    <td className="small bold" style={{ maxWidth: 260 }}>
                      {o.contest?.question || o.contestId}
                    </td>
                    <td>
                      <Badge tone={o.side === SIDE.YES ? 'green' : 'red'}>
                        {SIDE_LABEL[o.side]}
                      </Badge>
                    </td>
                    <td className="num">{o.requestedShares}</td>
                    <td className="num">{o.matchedShares}</td>
                    <td className="num">{formatTokens(o.totalDebit)}</td>
                    <td className="num mono muted">
                      {o.contest?.finalValue ?? '-'}
                    </td>
                    <td
                      className={`num bold ${
                        o.pnl > 0 ? 'text-yes' : o.pnl < 0 ? 'text-no' : ''
                      }`}
                    >
                      {o.pnl === null || o.pnl === undefined ? '-' : formatSigned(o.pnl)}
                    </td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td>
                      <Link to={`/contest/${o.contestId}`} className="icon-btn" aria-label="Open contest">
                        <IconChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---- phones ---- */}
          <div className="record-list">
            {orders.map((o) => (
              <Link to={`/contest/${o.contestId}`} className="record" key={o.id}>
                <div className="record__top">
                  <Badge tone={o.side === SIDE.YES ? 'green' : 'red'}>{SIDE_LABEL[o.side]}</Badge>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="small bold">{o.contest?.question || o.contestId}</div>
                <div className="row row-between mt-2 tiny muted">
                  <span>
                    {o.matchedShares}/{o.requestedShares} matched &middot;{' '}
                    {formatTokens(o.totalDebit)} paid
                    {o.pnl !== null && o.pnl !== undefined && (
                      <>
                        {' '}
                        &middot;{' '}
                        <span className={o.pnl > 0 ? 'text-yes' : o.pnl < 0 ? 'text-no' : ''}>
                          {formatSigned(o.pnl)}
                        </span>
                      </>
                    )}
                  </span>
                  <span>{formatDateTime(o.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
