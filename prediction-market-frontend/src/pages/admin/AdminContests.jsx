/**
 * AdminContests.jsx
 * Every contest with its matching numbers, and the two admin actions the spec
 * requires: cancel (refund everyone) and resolve.
 *
 * Resolving is no longer a choice between two buttons. The admin types the
 * number that actually happened in the match - runs scored, partnership total -
 * and every matched share is revalued to it. The dialog previews exactly what
 * each side will receive before anything moves, because settlement cannot be
 * undone.
 */

import { useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { ContestStatusBadge } from '../../components/common/StatusBadge';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import * as adminService from '../../api/adminService';
import {
  buyValuePerShare,
  formatDateShort,
  formatSigned,
  formatTokens,
} from '../../utils/format';
import { CONTEST_STATUS, SIDE, SIDE_LABEL } from '../../utils/constants';
import { IconAlert, IconPlus } from '../../components/common/Icons';

export default function AdminContests() {
  const { data: contests, loading, reload } = useAsync(adminService.fetchAdminContests, []);
  const toast = useToast();

  const [resolving, setResolving] = useState(null); // contest being resolved
  const [finalValue, setFinalValue] = useState(''); // the number the admin types
  const [cancelling, setCancelling] = useState(null); // contest being cancelled
  const [busy, setBusy] = useState(false);

  /**
   * The same arithmetic the backend will run, shown before the admin commits.
   * Nothing here is sent to the server - the server recomputes from the final
   * value alone - so this can never be a way to change what gets paid.
   */
  const preview = useMemo(() => {
    if (!resolving) return null;
    const price = Number(resolving.sharePrice) || 0;
    const raw = finalValue.trim();
    if (raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return null;

    const value = Math.floor(Number(raw));
    const buy = buyValuePerShare(price, value);
    const sell = price * 2 - buy;
    return {
      value,
      buy,
      sell,
      buyPnl: buy - price,
      sellPnl: sell - price,
      capped: value > price * 2,
      flat: buy === sell,
    };
  }, [resolving, finalValue]);

  const doResolve = async () => {
    setBusy(true);
    try {
      await adminService.resolveContest(resolving.id, preview.value);
      toast.success(
        'Question settled',
        `Settled at ${preview.value}. Every matched share has been revalued and wallets updated.`
      );
      setResolving(null);
      reload();
    } catch (err) {
      toast.error('Could not settle', err.message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      await adminService.cancelContest(cancelling.id);
      toast.success('Question cancelled', 'Every entry has been refunded in full.');
      setCancelling(null);
      reload();
    } catch (err) {
      toast.error('Could not cancel', err.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async (contest) => {
    try {
      await adminService.publishContest(contest.id);
      toast.success('Question published', 'Players can now see it inside its event.');
      reload();
    } catch (err) {
      toast.error('Could not publish', err.message);
    }
  };

  if (loading && !contests) return <LoadingBlock label="Loading questions..." />;

  if (!contests?.length) {
    return (
      <EmptyState
        title="No questions yet"
        text="Create an event first, then add questions to it."
        actionLabel="Create a question"
        actionTo="/admin/contests/new"
      />
    );
  }

  const canResolve = (c) =>
    ![CONTEST_STATUS.SETTLED, CONTEST_STATUS.CANCELLED, CONTEST_STATUS.DRAFT].includes(c.status) &&
    (c.matchedShares || 0) > 0;

  const canCancel = (c) =>
    ![CONTEST_STATUS.SETTLED, CONTEST_STATUS.CANCELLED].includes(c.status);

  return (
    <div className="stack stack-5" style={{ gap: 'var(--s-5)' }}>
      <div className="row row-between row-wrap">
        <span className="small muted">{contests.length} questions</span>
        <Button size="sm" to="/admin/contests/new" icon={<IconPlus size={15} />}>
          New question
        </Button>
      </div>

      {/* ---- wide screens ---- */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Question</th>
              <th>Status</th>
              <th className="num">Price</th>
              <th className="num">BUY</th>
              <th className="num">SELL</th>
              <th className="num">Matched</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contests.map((c) => (
              <tr key={c.id}>
                <td className="small muted nowrap">{c.eventTitle}</td>
                <td className="small bold" style={{ maxWidth: 280 }}>
                  {c.question}
                  {c.finalValue !== null && c.finalValue !== undefined && (
                    <Badge
                      tone={c.result === SIDE.YES ? 'green' : c.result === SIDE.NO ? 'red' : 'neutral'}
                      className="mt-2"
                    >
                      Settled at {formatTokens(c.finalValue)}
                      {c.result ? ` - ${SIDE_LABEL[c.result]} gained` : ' - draw'}
                    </Badge>
                  )}
                </td>
                <td>
                  <ContestStatusBadge status={c.status} />
                </td>
                <td className="num">{formatTokens(c.sharePrice)}</td>
                <td className="num text-yes">{c.yesShares || 0}</td>
                <td className="num text-no">{c.noShares || 0}</td>
                <td className="num bold">{c.matchedShares || 0}</td>
                <td className="small nowrap">{formatDateShort(c.matchingDeadline)}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    {c.status === CONTEST_STATUS.DRAFT && (
                      <Button size="sm" variant="subtle" onClick={() => publish(c)}>
                        Publish
                      </Button>
                    )}
                    {canResolve(c) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolving(c);
                          setFinalValue('');
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                    {canCancel(c) && (
                      <Button size="sm" variant="dangerGhost" onClick={() => setCancelling(c)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- phones ---- */}
      <div className="record-list">
        {contests.map((c) => (
          <div className="record" key={c.id}>
            <div className="record__top">
              <span className="bold small">{c.question}</span>
              <ContestStatusBadge status={c.status} />
            </div>
            <div className="tiny muted">
              {c.eventTitle} &middot; {formatTokens(c.sharePrice)} per share &middot; BUY{' '}
              {c.yesShares || 0} / SELL {c.noShares || 0} &middot; {c.matchedShares || 0} matched
            </div>
            <div className="row mt-4" style={{ gap: 6 }}>
              {c.status === CONTEST_STATUS.DRAFT && (
                <Button size="sm" variant="subtle" onClick={() => publish(c)}>
                  Publish
                </Button>
              )}
              {canResolve(c) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setResolving(c);
                    setFinalValue('');
                  }}
                >
                  Resolve
                </Button>
              )}
              {canCancel(c) && (
                <Button size="sm" variant="dangerGhost" onClick={() => setCancelling(c)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ---- resolve ---- */}
      <Modal
        open={Boolean(resolving)}
        title="Enter the final value"
        onClose={() => !busy && setResolving(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolving(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={doResolve} loading={busy} disabled={!preview}>
              {preview ? `Settle at ${preview.value}` : 'Settle'}
            </Button>
          </>
        }
      >
        {resolving && (
          <div className="stack stack-4">
            <p className="small bold">{resolving.question}</p>

            <div className="field">
              <label className="label" htmlFor="finalValue">
                What actually happened? (priced at {formatTokens(resolving.sharePrice)})
              </label>
              <input
                id="finalValue"
                type="number"
                min="0"
                inputMode="numeric"
                autoFocus
                className="input mono"
                placeholder={`e.g. ${Number(resolving.sharePrice) + 20}`}
                value={finalValue}
                onChange={(e) => setFinalValue(e.target.value)}
              />
              <div className="tiny muted mt-2">
                Every matched share is revalued to this number. Above{' '}
                {formatTokens(resolving.sharePrice)} the BUY side gains; below it the SELL side does.
              </div>
            </div>

            {preview && (
              <div className="panel">
                <div className="calc-row">
                  <span className="calc-row__label">
                    BUY receives{' '}
                    <span className="tiny muted">per share</span>
                  </span>
                  <span className="calc-row__value text-yes">
                    {formatTokens(preview.buy)}{' '}
                    <span className="tiny">({formatSigned(preview.buyPnl)})</span>
                  </span>
                </div>
                <div className="calc-row">
                  <span className="calc-row__label">
                    SELL receives <span className="tiny muted">per share</span>
                  </span>
                  <span className="calc-row__value text-no">
                    {formatTokens(preview.sell)}{' '}
                    <span className="tiny">({formatSigned(preview.sellPnl)})</span>
                  </span>
                </div>
                <div className="calc-row calc-row--total">
                  <span className="calc-row__label">Matched shares affected</span>
                  <span className="calc-row__value">{resolving.matchedShares || 0}</span>
                </div>
              </div>
            )}

            {preview?.flat && (
              <div className="notice">
                <span className="notice__icon">
                  <IconAlert size={16} />
                </span>
                <span className="tiny">
                  That is exactly the share price, so this settles as a draw - both sides get their
                  stake back and only the 10% entry charge is kept.
                </span>
              </div>
            )}

            {preview?.capped && (
              <div className="notice">
                <span className="notice__icon">
                  <IconAlert size={16} />
                </span>
                <span className="tiny">
                  This is above {formatTokens(resolving.sharePrice * 2)}, so the payout is capped
                  there. Each side only staked {formatTokens(resolving.sharePrice)} per share, so
                  that is the most the SELL side can pay out - {formatTokens(preview.value)} settles
                  identically to {formatTokens(resolving.sharePrice * 2)}.
                </span>
              </div>
            )}

            <div className="notice notice--danger">
              <span className="notice__icon">
                <IconAlert size={16} />
              </span>
              <span>
                <strong>Settlement runs immediately and cannot be reversed</strong>
                {resolving.matchedShares} matched shares will be revalued, any unmatched shares are
                refunded with their charge, and every affected wallet is updated on the spot.
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- cancel ---- */}
      <Modal
        open={Boolean(cancelling)}
        title="Cancel this question?"
        onClose={() => !busy && setCancelling(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelling(null)} disabled={busy}>
              Keep it open
            </Button>
            <Button variant="no" onClick={doCancel} loading={busy}>
              Cancel &amp; refund everyone
            </Button>
          </>
        }
      >
        {cancelling && (
          <div className="stack stack-4">
            <p className="small bold">{cancelling.question}</p>
            <div className="notice notice--danger">
              <span className="notice__icon">
                <IconAlert size={16} />
              </span>
              <span>
                <strong>Everyone gets their full entry back</strong>
                Base amount and the 10% simulated charge are both returned. Players will see:
                "Contest cancelled by admin because an opponent was not found. Your tokens have been
                refunded."
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
