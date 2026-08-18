/**
 * EntryModal.jsx
 * The pop-up that appears only after the user taps BUY or SELL.
 *
 * It asks one thing - how many shares - then shows exactly what will leave the
 * wallet. The side can still be flipped inside the modal, and the confirm
 * button always reads BUY or SELL to match the current choice.
 *
 * Maths (spec section 5):
 *   base   = sharePrice x shares
 *   charge = 10% of base    (a simulated project charge, NOT a tax)
 *   total  = base + charge
 * The server recalculates all three; this is only instant feedback.
 */

import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ShareStepper from '../common/ShareStepper';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';
import * as orderService from '../../api/orderService';
import { calculateEntry, formatTokens, maxSwing } from '../../utils/format';
import { validateShares } from '../../utils/validators';
import { CHARGE_RATE, SIDE, SIDE_LABEL } from '../../utils/constants';
import { IconAlert, IconInfo } from '../common/Icons';

export default function EntryModal({ contest, open, initialSide, onClose, onPlaced }) {
  const { wallet, refresh: refreshWallet } = useWallet();
  const toast = useToast();

  const [side, setSide] = useState(initialSide || SIDE.YES);
  const [shares, setShares] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  /* Reset to a clean state every time the modal is opened. */
  useEffect(() => {
    if (open) {
      setSide(initialSide || SIDE.YES);
      setShares(1);
    }
  }, [open, initialSide]);

  const entry = useMemo(
    () => calculateEntry(contest.sharePrice, shares || 0),
    [contest.sharePrice, shares]
  );

  const maxAffordable = Math.max(
    0,
    Math.floor(wallet.available / (contest.sharePrice * (1 + CHARGE_RATE)))
  );

  const shareError = validateShares(shares, maxAffordable);

  const submit = async () => {
    setSubmitting(true);
    try {
      await orderService.placeOrder({ contestId: contest.id, side, shares });
      toast.success(
        `${SIDE_LABEL[side]} placed`,
        `${shares} ${shares === 1 ? 'share' : 'shares'} for ${formatTokens(entry.totalDebit)} tokens.`
      );
      await refreshWallet();
      onPlaced?.();
      onClose?.();
    } catch (err) {
      toast.error('Could not place entry', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`${SIDE_LABEL[side]} shares`}
      onClose={() => !submitting && onClose?.()}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={side === SIDE.NO ? 'no' : 'yes'}
            onClick={submit}
            loading={submitting}
            disabled={Boolean(shareError)}
          >
            {SIDE_LABEL[side]} &middot; {formatTokens(entry.totalDebit)} tokens
          </Button>
        </>
      }
    >
      <div className="stack stack-4">
        <p className="small bold" style={{ color: 'var(--ink-700)' }}>
          {contest.question}
        </p>

        {/* ---- side (can be flipped without closing) ---- */}
        <div className="side-buttons">
          <button
            type="button"
            className={`side-btn side-btn--yes is-outline ${side === SIDE.YES ? 'is-active' : ''}`}
            onClick={() => setSide(SIDE.YES)}
            aria-pressed={side === SIDE.YES}
          >
            <span className="side-btn__label">BUY</span>
            <span className="side-btn__hint">{contest.yesRule}</span>
          </button>
          <button
            type="button"
            className={`side-btn side-btn--no is-outline ${side === SIDE.NO ? 'is-active' : ''}`}
            onClick={() => setSide(SIDE.NO)}
            aria-pressed={side === SIDE.NO}
          >
            <span className="side-btn__label">SELL</span>
            <span className="side-btn__hint">{contest.noRule}</span>
          </button>
        </div>

        {/* ---- quantity ---- */}
        <div className="stack stack-2">
          <div className="row row-between">
            <span className="label">How many shares?</span>
            <span className="tiny muted">You can afford {maxAffordable}</span>
          </div>
          <ShareStepper value={shares} onChange={setShares} max={Math.max(1, maxAffordable)} />
          {shareError && shares !== '' && (
            <span className="field-error">
              <IconAlert size={13} /> {shareError}
            </span>
          )}
        </div>

        {/* ---- cost ---- */}
        <div className="panel">
          <div className="calc-row">
            <span className="calc-row__label">
              {formatTokens(contest.sharePrice)} x {entry.shares || 0} shares
            </span>
            <span className="calc-row__value">{formatTokens(entry.baseAmount)}</span>
          </div>
          <div className="calc-row">
            <span className="calc-row__label">10% simulated charge</span>
            <span className="calc-row__value">{formatTokens(entry.charge)}</span>
          </div>
          <div className="calc-row calc-row--total">
            <span className="calc-row__label">Total from wallet</span>
            <span className="calc-row__value">{formatTokens(entry.totalDebit)}</span>
          </div>
        </div>

        {/* ---- what can happen -------------------------------------------
             The cap is stated here rather than discovered at settlement. On a
             share priced at P the swing either way is exactly P per share,
             because P per share is all the collateral each side put up. */}
        <div className="panel-quiet">
          <div className="calc-row">
            <span className="calc-row__label">
              If it settles above {formatTokens(contest.sharePrice)}
            </span>
            <span className="calc-row__value">
              <span className={side === SIDE.YES ? 'text-yes' : 'text-no'}>
                {side === SIDE.YES ? 'you gain' : 'you lose'}
              </span>{' '}
              1 token per point, per share
            </span>
          </div>
          <div className="calc-row">
            <span className="calc-row__label">
              If it settles below {formatTokens(contest.sharePrice)}
            </span>
            <span className="calc-row__value">
              <span className={side === SIDE.NO ? 'text-yes' : 'text-no'}>
                {side === SIDE.NO ? 'you gain' : 'you lose'}
              </span>{' '}
              1 token per point, per share
            </span>
          </div>
          <div className="calc-row calc-row--total">
            <span className="calc-row__label">Most you can gain or lose</span>
            <span className="calc-row__value mono">
              &plusmn;{formatTokens(maxSwing(contest.sharePrice, entry.shares || 0))}
            </span>
          </div>
        </div>

        <div className="notice">
          <span className="notice__icon">
            <IconInfo size={16} />
          </span>
          <span className="tiny">
            Your shares are revalued to whatever the real number turns out to be - you gain or lose
            the difference, never your whole stake. Gains and losses stop at{' '}
            {formatTokens(contest.sharePrice)} per share because that is all either side staked.
            Unmatched shares are refunded with their charge, and if no opponent is found at all the
            whole amount comes back.
          </span>
        </div>
      </div>
    </Modal>
  );
}
