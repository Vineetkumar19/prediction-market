/**
 * orderService.js
 *
 * Backend contract:
 *   POST /api/orders      { contestId, side, shares } -> Order
 *   GET  /api/orders/my                               -> Order[] (with contest)
 *
 * Note: the client sends only side + share count. The server recalculates
 * base amount, the 10% simulated charge and the total debit itself
 * (spec section 5 - "the server is authoritative").
 */

import http from './client';

export const placeOrder = ({ contestId, side, shares }) =>
  http.post('/orders', { contestId, side, shares: Math.floor(Number(shares)) });

export const fetchMyOrders = () => http.get('/orders/my');
