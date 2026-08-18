/**
 * eventService.js
 * An event is the real-world thing people predict on ("India vs Pakistan").
 * Each event holds many questions.
 *
 * Backend contract:
 *   GET /api/events        -> Event[]
 *   GET /api/events/{id}   -> Event & { contests: Contest[] }
 */

import http from './client';

export const fetchEvents = () => http.get('/events');

export const fetchEvent = (eventId) => http.get(`/events/${eventId}`);
