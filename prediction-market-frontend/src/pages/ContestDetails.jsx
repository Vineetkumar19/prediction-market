/**
 * ContestDetails.jsx
 * One question, stripped to the essentials.
 *
 * The whole screen is: the question, two buttons carrying the price, one line
 * of explanation, and your own position if you have one. Nothing about how
 * many shares other people hold - that is deliberately private.
 *
 * Tapping BUY or SELL opens the entry pop-up; nothing else on this page asks
 * for input.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ContestImage from '../components/contest/ContestImage';
import EntryModal from '../components/contest/EntryModal';
import MatchStatus from '../components/contest/MatchStatus';
import { PlayerStatusBadge } from '../components/common/StatusBadge';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { LoadingBlock } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import useCountdown from '../hooks/useCountdown';
import { formatTokens } from '../utils/format';
import { CONTEST_STATUS, JOINABLE_STATUSES, SIDE, SIDE_LABEL } from '../utils/constants';
import * as contestService from '../api/contestService';
import { IconArrowLeft, IconClock, IconInfo, IconLock } from '../components/common/Icons';

export default function ContestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fetcher = useCallback(() => contestService.fetchContest(id), [id]);
  const { data: contest, loading, error, reload } = useAsync(fetcher, [id]);

  const countdown = useCountdown(contest?.matchingDeadline);

  // The entry box only exists once a side has been chosen.
  const [entrySide, setEntrySide] = useState(null);

  /* Arriving from a card's BUY/SELL button opens the box straight away. */
  useEffect(() => {
    if (contest && location.state?.openSide) {
      setEntrySide(location.state.openSide);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [contest, location.state, location.pathname, navigate]);

  useEffect(() => {
    const handler = () => reload().catch(() => {});
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [reload]);

  if (loading && !contest) {
    return (
      <div className="container page">
        <LoadingBlock label="Loading question..." />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="container page">
        <EmptyState
          title="Question not found"
          text={error?.message || 'This question may have been removed.'}
          actionLabel="Back to events"
          actionTo="/"
        />
      </div>
    );
  }

  const entriesOpen = JOINABLE_STATUSES.includes(contest.status) && !countdown.expired;
  const cancelled = contest.status === CONTEST_STATUS.CANCELLED;

  return (
    <div className="container page">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
        <IconArrowLeft size={15} /> Back
      </button>

      <div className="question-layout">
        <article className="detail-hero">
          {/* Falls back to the event picture so the page is never bare. */}
          <div className="detail-hero__media">
            <ContestImage
              src={contest.imageUrl || contest.eventImageUrl}
              alt=""
              letter={contest.eventTitle || contest.title}
            />
          </div>

          <div className="detail-hero__body">
            {contest.eventTitle && (
              <Link to={`/event/${contest.eventId}`} className="question-event-link">
                {contest.eventTitle}
              </Link>
            )}

            <div className="row row-wrap" style={{ gap: 'var(--s-2)' }}>
              <PlayerStatusBadge status={contest.status} />
              <Badge tone={countdown.urgent ? 'red' : 'yellow'} dot>
                <IconClock size={11} /> {countdown.text}
              </Badge>
              {contest.finalValue !== null && contest.finalValue !== undefined && (
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

            <h1 className="detail-hero__question">{contest.question}</h1>

            {/* ---- the only two controls on this page ---- */}
            {entriesOpen ? (
              <div className="side-buttons side-buttons--lg">
                <button
                  type="button"
                  className="side-btn side-btn--yes"
                  onClick={() => setEntrySide(SIDE.YES)}
                >
                  <span className="side-btn__label">BUY</span>
                  <span className="side-btn__hint">{contest.yesRule}</span>
                  <span className="side-btn__price">
                    {formatTokens(contest.sharePrice)} per share
                  </span>
                </button>
                <button
                  type="button"
                  className="side-btn side-btn--no"
                  onClick={() => setEntrySide(SIDE.NO)}
                >
                  <span className="side-btn__label">SELL</span>
                  <span className="side-btn__hint">{contest.noRule}</span>
                  <span className="side-btn__price">
                    {formatTokens(contest.sharePrice)} per share
                  </span>
                </button>
              </div>
            ) : (
              <div className={`notice ${cancelled ? 'notice--danger' : ''}`}>
                <span className="notice__icon">
                  {cancelled ? <IconInfo size={17} /> : <IconLock size={17} />}
                </span>
                <span>
                  <strong>{cancelled ? 'Question cancelled' : 'Entries are closed'}</strong>
                  {cancelled
                    ? 'Cancelled by admin because an opponent was not found. Your tokens have been refunded in full, including the 10% simulated charge.'
                    : 'This question is no longer accepting new positions.'}
                </span>
              </div>
            )}

            {/* ---- the one line worth keeping ---- */}
            {entriesOpen && (
              <div className="notice">
                <span className="notice__icon">
                  <IconInfo size={16} />
                </span>
                <span className="small">
                  Your shares only count once an opponent takes the opposite side.
                </span>
              </div>
            )}
          </div>
        </article>

        {/* ---- your own position ---- */}
        {contest.myOrders?.length > 0 && (
          <section className="stack stack-3">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Your position{contest.myOrders.length > 1 ? 's' : ''}
            </h2>
            {contest.myOrders.map((order) => (
              <MatchStatus key={order.id} order={order} finalValue={contest.finalValue} />
            ))}
          </section>
        )}
      </div>

      {/* ---- the pop-up, only once a side is chosen ---- */}
      <EntryModal
        contest={contest}
        open={Boolean(entrySide)}
        initialSide={entrySide}
        onClose={() => setEntrySide(null)}
        onPlaced={() => reload()}
      />
    </div>
  );
}
