/**
 * MatchStatus.jsx
 * The live "5 of 10 shares matched" panel from spec section 9.
 * Values come from REST; the WebSocket only tells the page when to re-fetch.
 */

import Badge from '../common/Badge';
import { OrderStatusBadge } from '../common/StatusBadge';
import { formatSigned, formatTokens, percent } from '../../utils/format';
import { ORDER_STATUS, SIDE, SIDE_LABEL } from '../../utils/constants';
import { IconCheckCircle, IconClock } from '../common/Icons';

const SETTLED_STATUSES = [
  ORDER_STATUS.SETTLED_PROFIT,
  ORDER_STATUS.SETTLED_LOSS,
  ORDER_STATUS.SETTLED_FLAT,
];

function statusLine(order) {
  if (SETTLED_STATUSES.includes(order.status)) {
    return 'This question has been settled. Your shares were revalued to the final number.';
  }
  if (order.status === ORDER_STATUS.CANCELLED) {
    return 'Contest cancelled by admin because an opponent was not found. Your tokens have been refunded.';
  }
  if (order.status === ORDER_STATUS.REFUNDED) {
    return `${order.requestedShares - order.matchedShares} shares could not be matched. The unmatched amount has been refunded.`;
  }
  if (order.remainingShares === 0 && order.matchedShares > 0) {
    return 'All shares have an opponent. This contest will proceed.';
  }
  if (order.matchedShares > 0) {
    return `Opponent found for ${order.matchedShares} shares. Waiting for the remaining ${order.remainingShares}.`;
  }
  return 'Waiting for an opponent to take the other side...';
}

export default function MatchStatus({ order, finalValue }) {
  const pct = percent(order.matchedShares, order.requestedShares);
  const settled = SETTLED_STATUSES.includes(order.status);
  const pnl = Number(order.pnl ?? 0);

  return (
    <div className="card card-pad stack stack-4">
      <div className="row row-between">
        <div className="row" style={{ gap: 8 }}>
          <Badge tone={order.side === SIDE.YES ? 'green' : 'red'}>{SIDE_LABEL[order.side]}</Badge>
          <span className="small muted">{order.requestedShares} shares requested</span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div>
        <div className="match-status__figures">
          <span className="match-status__big">
            {order.matchedShares} / {order.requestedShares}
          </span>
          <span className="small muted">{order.remainingShares} remaining</span>
        </div>
        <div className="progress">
          <div
            className={`progress__fill ${
              pct === 100 ? 'progress__fill--full' : pct === 0 ? 'progress__fill--none' : ''
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <span style={{ color: pct === 100 ? 'var(--green-600)' : 'var(--ink-500)', marginTop: 1 }}>
          {pct === 100 ? <IconCheckCircle size={17} /> : <IconClock size={17} />}
        </span>
        <p className="small" style={{ color: 'var(--ink-700)' }}>
          {statusLine(order)}
        </p>
      </div>

      <hr className="divider" style={{ margin: 0 }} />

      <div>
        <div className="calc-row">
          <span className="calc-row__label">Base paid</span>
          <span className="calc-row__value">{formatTokens(order.baseAmount)}</span>
        </div>
        <div className="calc-row">
          <span className="calc-row__label">10% simulated charge</span>
          <span className="calc-row__value">{formatTokens(order.charge)}</span>
        </div>
        <div className="calc-row calc-row--total">
          <span className="calc-row__label">Total debited</span>
          <span className="calc-row__value">{formatTokens(order.totalDebit)}</span>
        </div>
      </div>

      {settled && (
        <>
          <div>
            <div className="calc-row">
              <span className="calc-row__label">
                Settled at{' '}
                <span className="mono bold">
                  {finalValue ?? order.contest?.finalValue ?? '-'}
                </span>
              </span>
              <span className="calc-row__value">
                {order.matchedShares} matched share{order.matchedShares === 1 ? '' : 's'}
              </span>
            </div>
            <div className="calc-row">
              <span className="calc-row__label">Returned to your wallet</span>
              <span className="calc-row__value">{formatTokens(order.settlementReturn ?? 0)}</span>
            </div>
            <div className="calc-row calc-row--total">
              <span className="calc-row__label">Profit / loss</span>
              <span
                className={`calc-row__value ${
                  pnl > 0 ? 'text-yes' : pnl < 0 ? 'text-no' : ''
                }`}
              >
                {formatSigned(pnl)}
              </span>
            </div>
          </div>

          <div
            className={`notice ${
              pnl > 0 ? 'notice--success' : pnl < 0 ? 'notice--danger' : ''
            }`}
          >
            <span className="notice__icon">
              <IconCheckCircle size={17} />
            </span>
            <span>
              <strong>
                {pnl > 0
                  ? `Your shares gained ${formatTokens(pnl)} tokens`
                  : pnl < 0
                    ? `Your shares lost ${formatTokens(Math.abs(pnl))} tokens`
                    : 'Your shares finished exactly where they started'}
              </strong>
              Settlement is complete and your wallet has been updated. The 10% entry charge is not
              part of this figure - it was taken when you entered.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
