/**
 * TransactionTable.jsx
 * Every wallet movement, exactly as listed in spec section 15:
 * admin credits, contest entries, the 10% simulated charge, refunds,
 * cancellations, winnings and losses.
 *
 * Renders as a table on wide screens and as stacked record cards on phones -
 * both are in the DOM and CSS shows the right one, so there is no layout
 * flicker while JavaScript measures the viewport.
 */

import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { formatDateShort, formatDateTime, formatSigned } from '../../utils/format';
import { TX_TYPE_META } from '../../utils/constants';
import { IconHistory } from '../common/Icons';

function Amount({ value }) {
  const n = Number(value) || 0;
  if (n === 0) return <span className="muted">0</span>;
  return <span className={n > 0 ? 'amount-pos' : 'amount-neg'}>{formatSigned(n)}</span>;
}

export default function TransactionTable({ transactions }) {
  if (!transactions?.length) {
    return (
      <EmptyState
        icon={<IconHistory size={24} />}
        title="No transactions yet"
        text="Every token movement will appear here - admin credits, contest entries, the 10% simulated charge, refunds and settlements."
      />
    );
  }

  return (
    <>
      {/* ---- wide screens ---- */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date &amp; time</th>
              <th>Type</th>
              <th>Contest</th>
              <th>Note</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const meta = TX_TYPE_META[t.type] || { label: t.type, tone: 'neutral' };
              return (
                <tr key={t.id}>
                  <td className="nowrap mono small">{formatDateShort(t.createdAt)}</td>
                  <td>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </td>
                  <td className="small">{t.contestTitle || <span className="muted">-</span>}</td>
                  <td className="small muted">{t.note || '-'}</td>
                  <td className="num">
                    <Amount value={t.amount} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- phones ---- */}
      <div className="record-list">
        {transactions.map((t) => {
          const meta = TX_TYPE_META[t.type] || { label: t.type, tone: 'neutral' };
          return (
            <div key={t.id} className="record">
              <div className="record__top">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="record__amount">
                  <Amount value={t.amount} />
                </span>
              </div>
              {t.contestTitle && <div className="small bold">{t.contestTitle}</div>}
              {t.note && <div className="small muted">{t.note}</div>}
              <div className="tiny muted mt-2">{formatDateTime(t.createdAt)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
