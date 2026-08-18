/**
 * Home.jsx
 * The front screen. It lists EVENTS, not questions.
 *
 * An event is a real-world thing - "India vs Pakistan", "NIFTY weekly close".
 * Each card shows only an image, the event title and the label the admin chose.
 * Opening an event shows every question inside it.
 */

import { useEffect, useMemo, useState } from 'react';
import EventCard from '../components/event/EventCard';
import EmptyState from '../components/common/EmptyState';
import { CardSkeletonGrid } from '../components/common/Spinner';
import Button from '../components/common/Button';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import * as eventService from '../api/eventService';
import { formatTokens } from '../utils/format';
import { EVENT_STATUS } from '../utils/constants';
import { IconGrid, IconRefresh, IconSearch } from '../components/common/Icons';

const FILTERS = [
  { key: 'live', label: 'Live' },
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'My entries' },
  { key: 'closed', label: 'Closed' },
];

export default function Home() {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const { data: events, loading, error, reload } = useAsync(eventService.fetchEvents, []);

  const [filter, setFilter] = useState('live');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = () => reload().catch(() => {});
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [reload]);

  const visible = useMemo(() => {
    const list = events || [];
    const q = query.trim().toLowerCase();

    return list.filter((e) => {
      const matchesQuery =
        !q || e.title.toLowerCase().includes(q) || (e.label || '').toLowerCase().includes(q);
      if (!matchesQuery) return false;

      const isLive = e.status === EVENT_STATUS.OPEN && e.liveQuestionCount > 0;

      switch (filter) {
        case 'live':
          return isLive;
        case 'mine':
          return e.myEntryCount > 0;
        case 'closed':
          return !isLive;
        default:
          return true;
      }
    });
  }, [events, filter, query]);

  const liveCount = (events || []).filter(
    (e) => e.status === EVENT_STATUS.OPEN && e.liveQuestionCount > 0
  ).length;
  const myEvents = (events || []).filter((e) => e.myEntryCount > 0).length;

  return (
    <div className="container page">
      {/* ---- hero ---- */}
      <section className="home-hero">
        <div>
          <h1 className="home-hero__title">Hello {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="home-hero__text">
            Pick an event to see every question inside it. Choose BUY if you think it goes above the
            target, SELL if you think it stays below.
          </p>
        </div>
        <div className="home-hero__stats">
          <div>
            <div className="home-hero__stat-value">{formatTokens(wallet.available)}</div>
            <div className="home-hero__stat-label">Tokens available</div>
          </div>
          <div>
            <div className="home-hero__stat-value">{liveCount}</div>
            <div className="home-hero__stat-label">Live events</div>
          </div>
          <div>
            <div className="home-hero__stat-value">{myEvents}</div>
            <div className="home-hero__stat-label">Your entries</div>
          </div>
        </div>
      </section>

      {/* ---- toolbar ---- */}
      <div className="toolbar">
        <div className="search">
          <span className="search__icon">
            <IconSearch />
          </span>
          <input
            className="input"
            placeholder="Search events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
          />
        </div>

        <div className="row" style={{ gap: 'var(--s-3)' }}>
          <div className="segmented" role="tablist" aria-label="Filter events">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`segmented__btn ${filter === f.key ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-btn hide-on-phone"
            onClick={() => reload()}
            aria-label="Refresh"
            title="Refresh"
          >
            <IconRefresh />
          </button>
        </div>
      </div>

      {/* ---- grid ---- */}
      {loading && !events ? (
        <CardSkeletonGrid />
      ) : error ? (
        <EmptyState
          title="Could not load events"
          text={error.message}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconGrid size={24} />}
          title={query ? 'No events match your search' : 'No events here yet'}
          text={
            query
              ? 'Try a different word, or switch the filter to "All".'
              : filter === 'mine'
              ? 'You have not entered any question yet. Open a live event and take a side.'
              : 'The admin has not published an event yet. Check back soon.'
          }
          actionLabel={filter !== 'all' ? 'Show all events' : undefined}
          onAction={() => {
            setFilter('all');
            setQuery('');
          }}
        />
      ) : (
        <>
          <div className="event-grid">
            {visible.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <div className="center mt-6">
            <Button variant="ghost" size="sm" icon={<IconRefresh size={15} />} onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
