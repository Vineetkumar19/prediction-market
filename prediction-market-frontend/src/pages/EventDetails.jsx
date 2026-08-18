/**
 * EventDetails.jsx
 * One event ("India vs Pakistan") and every question inside it.
 *
 * This is the screen the home grid opens into. The header carries the event
 * image and title; below it sits the grid of questions, each with its own
 * BUY and SELL buttons.
 */

import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ContestCard from '../components/contest/ContestCard';
import ContestImage from '../components/contest/ContestImage';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { LoadingBlock } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import * as eventService from '../api/eventService';
import { EVENT_STATUS, JOINABLE_STATUSES } from '../utils/constants';
import { IconArrowLeft, IconGrid } from '../components/common/Icons';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const fetcher = useCallback(() => eventService.fetchEvent(id), [id]);
  const { data: event, loading, error, reload } = useAsync(fetcher, [id]);

  useEffect(() => {
    const handler = () => reload().catch(() => {});
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [reload]);

  if (loading && !event) {
    return (
      <div className="container page">
        <LoadingBlock label="Loading event..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container page">
        <EmptyState
          title="Event not found"
          text={error?.message || 'This event may have been removed.'}
          actionLabel="Back to events"
          actionTo="/"
        />
      </div>
    );
  }

  const live = (event.contests || []).filter((c) => JOINABLE_STATUSES.includes(c.status));
  const closed = (event.contests || []).filter((c) => !JOINABLE_STATUSES.includes(c.status));
  const isOpen = event.status === EVENT_STATUS.OPEN && live.length > 0;

  return (
    <div className="container page">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
        <IconArrowLeft size={15} /> Back
      </button>

      {/* ---- event header ---- */}
      <header className="event-header">
        <div className="event-header__media">
          <ContestImage src={event.imageUrl} alt="" letter={event.title} />
        </div>
        <div className="event-header__body">
          <Badge tone={isOpen ? 'green' : 'grey'} dot live={isOpen}>
            {isOpen ? 'Live now' : 'Closed'}
          </Badge>
          <h1 className="event-header__title">{event.title}</h1>
          <p className="event-header__label">{event.label}</p>
          <p className="small muted">
            {event.questionCount} {event.questionCount === 1 ? 'question' : 'questions'} in this
            event
            {event.myEntryCount > 0 && ` · you are in ${event.myEntryCount}`}
          </p>
        </div>
      </header>

      {/* ---- questions ---- */}
      {event.contests?.length === 0 ? (
        <EmptyState
          icon={<IconGrid size={24} />}
          title="No questions yet"
          text="The admin has not added any questions to this event."
          actionLabel="Back to events"
          actionTo="/"
        />
      ) : (
        <>
          {live.length > 0 && (
            <section>
              <h2 className="section-title">Open questions</h2>
              <div className="contest-grid">
                {live.map((c) => (
                  <ContestCard key={c.id} contest={c} />
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section className="mt-6" style={{ marginTop: 'var(--s-8)' }}>
              <h2 className="section-title">Closed questions</h2>
              <div className="contest-grid">
                {closed.map((c) => (
                  <ContestCard key={c.id} contest={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
