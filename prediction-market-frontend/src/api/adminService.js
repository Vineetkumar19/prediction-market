/**
 * adminService.js
 * Every endpoint here must be protected with ROLE_ADMIN on the backend.
 *
 * Backend contract:
 *   GET  /api/admin/stats
 *   GET  /api/admin/events
 *   POST /api/admin/events                 { title, label, imageUrl }
 *   POST /api/admin/events/{id}/toggle
 *   GET  /api/admin/users
 *   POST /api/admin/users/{id}/tokens      { amount, reason }
 *   GET  /api/admin/contests
 *   POST /api/admin/contests               { eventId, question, imageUrl, sharePrice, ..., publish }
 *   POST /api/admin/contests/{id}/publish
 *   POST /api/admin/contests/{id}/cancel
 *   POST /api/admin/contests/{id}/resolve  { finalValue: number }
 *   GET  /api/admin/transactions
 */

import http from './client';

export const fetchAdminStats = () => http.get('/admin/stats');

/* ---- events --------------------------------------------------------------- */

export const fetchAdminEvents = () => http.get('/admin/events');

export const createEvent = (payload) => http.post('/admin/events', payload);

export const toggleEvent = (eventId) => http.post(`/admin/events/${eventId}/toggle`);

/* ---- users & tokens ------------------------------------------------------- */

export const fetchAdminUsers = () => http.get('/admin/users');

export const adjustTokens = (userDbId, amount, reason) =>
  http.post(`/admin/users/${userDbId}/tokens`, { amount: Math.floor(Number(amount)), reason });

/* ---- questions ------------------------------------------------------------ */

export const fetchAdminContests = () => http.get('/admin/contests');

export const createContest = (payload) => http.post('/admin/contests', payload);

export const publishContest = (contestId) => http.post(`/admin/contests/${contestId}/publish`);

export const cancelContest = (contestId) => http.post(`/admin/contests/${contestId}/cancel`);

/**
 * `finalValue` is the number that actually happened in the match. The server
 * derives everything else from it - which side gained, by how much, and what
 * each wallet receives. Nothing about the payout is sent from here.
 */
export const resolveContest = (contestId, finalValue) =>
  http.post(`/admin/contests/${contestId}/resolve`, {
    finalValue: Math.floor(Number(finalValue)),
  });

/* ---- ledger --------------------------------------------------------------- */

export const fetchAdminTransactions = () => http.get('/admin/transactions');
