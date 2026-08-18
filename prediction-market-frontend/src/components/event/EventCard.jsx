/**
 * EventCard.jsx
 * One tile on the home screen. Deliberately minimal:
 *
 *   image  ->  event title ("India vs Pakistan")  ->  the label you chose
 *
 * No questions, no prices, no share counts. Tapping it opens the event page
 * where all the questions for that match live.
 */

import { Link } from 'react-router-dom';
import ContestImage from '../contest/ContestImage';
import { EVENT_STATUS } from '../../utils/constants';
import { IconCheck } from '../common/Icons';

export default function EventCard({ event }) {
  const isOpen = event.status === EVENT_STATUS.OPEN && event.liveQuestionCount > 0;

  return (
    <Link to={`/event/${event.id}`} className="event-card">
      <div className="event-card__media">
        <ContestImage src={event.imageUrl} alt="" letter={event.title} />

        <div className="event-card__media-top">
          <span className={`chip-glass ${isOpen ? 'chip-glass--live' : 'chip-glass--closed'}`}>
            <span className={`badge-dot ${isOpen ? 'badge-dot--live' : ''}`} />
            {isOpen ? 'Live' : 'Closed'}
          </span>

          <span className="chip-glass">
            {event.questionCount} {event.questionCount === 1 ? 'question' : 'questions'}
          </span>
        </div>

        {event.myEntryCount > 0 && (
          <span className="event-card__mine">
            <IconCheck size={12} /> You are in {event.myEntryCount}
          </span>
        )}
      </div>

      <div className="event-card__body">
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__label">{event.label}</p>
      </div>
    </Link>
  );
}
