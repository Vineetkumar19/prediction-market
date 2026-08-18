/**
 * contestService.js
 * A "contest" is one question inside an event.
 *
 * Backend contract:
 *   GET /api/contests/{id}  -> Contest
 *
 * Note: the response deliberately contains no market-wide numbers. A player
 * may only ever see their own position, never how many shares sit on each side.
 */

import http from './client';

export const fetchContest = (contestId) => http.get(`/contests/${contestId}`);
