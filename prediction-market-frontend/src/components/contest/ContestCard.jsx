/**
 * ContestCard.jsx
 * One question inside an event page.
 *
 * Deliberately shows nothing about the wider market - no share counts, no
 * player counts, no matched totals. Only the question, the price, and this
 * user's own position.
 *
 * The image block only appears when the admin gave this question its own
 * picture; otherwise the card stays compact, since every question in an event
 * already sits under the event's image.
 */

import { useNavigate } from 'react-router-dom';
import ContestImage from './ContestImage';
import Badge from '../common/Badge';
import useCountdown from '../../hooks/useCountdown';
import { formatTokens } from '../../utils/format';
import { CONTEST_STATUS, JOINABLE_STATUSES, SIDE, SIDE_LABEL } from '../../utils/constants';
import { IconCheck, IconClock } from '../common/Icons';

export default function ContestCard({ contest }) {
  const navigate = useNavigate();
  const countdown = useCountdown(contest.matchingDeadline);

  const open = JOINABLE_STATUSES.includes(contest.status) && !countdown.expired;
  const hasOwnImage = Boolean(contest.imageUrl);

  const go = (side) =>
    navigate(`/contest/${contest.id}`, { state: side ? { openSide: side } : undefined });

  return (
    <article className="contest-card">
      {hasOwnImage && (
        <div
          className="contest-card__media"
          role="button"
          tabIndex={0}
          onClick={() => go()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go()}
          style={{ cursor: 'pointer' }}
        >
          <ContestImage src={contest.imageUrl} alt="" letter={contest.title} />
        </div>
      )}

      <div className="contest-card__body">
        <div className="row row-between" style={{ gap: 'var(--s-2)', alignItems: 'flex-start' }}>
          <span
            className={`chip-glass ${
              countdown.expired
                ? 'chip-glass--closed'
                : countdown.urgent
                ? 'chip-glass--urgent'
                : 'chip-glass--live'
            }`}
            style={{ boxShadow: 'none' }}
          >
            <IconClock size={12} />
            {countdown.text}
          </span>

          {contest.status === CONTEST_STATUS.SETTLED &&
            contest.finalValue !== null &&
            contest.finalValue !== undefined && (
              <Badge
                tone={
                  contest.result === SIDE.YES
                    ? 'green'
                    : contest.result === SIDE.NO
                      ? 'red'
                      : 'neutral'
                }
              >
                Settled at {formatTokens(contest.finalValue)}
              </Badge>
            )}
        </div>

        <h3
          className="contest-card__question"
          onClick={() => go()}
          style={{ cursor: 'pointer' }}
          title={contest.question}
        >
          {contest.question}
        </h3>

        {contest.myShares > 0 && (
          <div className="contest-card__position">
            <IconCheck size={13} />
            You hold {contest.myShares} {SIDE_LABEL[contest.mySide]}{' '}
            {contest.myShares === 1 ? 'share' : 'shares'}
          </div>
        )}

        <div className="contest-card__actions">
          {open ? (
            <div className="side-buttons">
              <button type="button" className="side-btn side-btn--yes" onClick={() => go(SIDE.YES)}>
                <span className="side-btn__label">BUY</span>
                <span className="side-btn__hint">{formatTokens(contest.sharePrice)} per share</span>
              </button>
              <button type="button" className="side-btn side-btn--no" onClick={() => go(SIDE.NO)}>
                <span className="side-btn__label">SELL</span>
                <span className="side-btn__hint">{formatTokens(contest.sharePrice)} per share</span>
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-subtle btn-block" onClick={() => go()}>
              {contest.status === CONTEST_STATUS.CANCELLED
                ? 'Cancelled - view details'
                : 'Entries closed - view details'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
