/**
 * walletService.js
 *
 * Backend contract:
 *   GET /api/wallet               -> { available, locked, total }
 *   GET /api/wallet/transactions  -> WalletTransaction[]
 */

import http from './client';

export const fetchWallet = () => http.get('/wallet');

export const fetchTransactions = () => http.get('/wallet/transactions');
