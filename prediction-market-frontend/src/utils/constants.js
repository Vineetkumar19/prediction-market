/**
 * constants.js
 * Every enum the frontend shares with the Spring Boot backend lives here.
 * Keep these strings identical to the Java enums so no mapping layer is needed.
 */

/* ---- Environment ---------------------------------------------------------- */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const WS_URL = import.meta.env.VITE_WS_URL || '';

/* ---- localStorage keys ---------------------------------------------------- */

export const STORAGE_KEYS = {
  token: 'pms.token',
  user: 'pms.user',
};

/* ---- Roles ---------------------------------------------------------------- */

export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
};

/* ---- Order side ----------------------------------------------------------- */

/**
 * The backend enum stays YES/NO because that is what the outcome actually is.
 * The user never sees those words - the UI says BUY and SELL everywhere.
 */
export const SIDE = {
  YES: 'YES', // shown as BUY
  NO: 'NO', // shown as SELL
};

export const SIDE_LABEL = {
  YES: 'BUY',
  NO: 'SELL',
};

export const SIDE_SHORT = SIDE_LABEL;

/* ---- Events --------------------------------------------------------------
   An event is the real-world thing people are betting on: "India vs Pakistan",
   "NIFTY weekly close". Each event holds many questions (contests).
   -------------------------------------------------------------------------- */

export const EVENT_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};

export const EVENT_STATUS_META = {
  OPEN: { label: 'Live', tone: 'green' },
  CLOSED: { label: 'Closed', tone: 'grey' },
};

/* ---- Contest lifecycle (spec section 12) ---------------------------------- */

export const CONTEST_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  MATCHED: 'MATCHED',
  LOCKED: 'LOCKED',
  RESOLVED: 'RESOLVED',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
};

export const CONTEST_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'grey' },
  OPEN: { label: 'Open', tone: 'green' },
  PARTIAL: { label: 'Partially matched', tone: 'yellow' },
  MATCHED: { label: 'Fully matched', tone: 'green' },
  LOCKED: { label: 'Locked', tone: 'grey' },
  RESOLVED: { label: 'Result declared', tone: 'blue' },
  SETTLED: { label: 'Settled', tone: 'blue' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

/* Statuses in which a user may still place an entry. */
export const JOINABLE_STATUSES = [CONTEST_STATUS.OPEN, CONTEST_STATUS.PARTIAL];

/**
 * What a PLAYER is allowed to see.
 *
 * The raw status leaks market information - "Partially matched" tells everyone
 * that somebody has already taken a side. Players only ever see whether the
 * question is open, closed, settled or cancelled. The detailed status stays
 * on the admin screens.
 */
export const PLAYER_STATUS_META = {
  OPEN: { label: 'Open', tone: 'green', live: true },
  PARTIAL: { label: 'Open', tone: 'green', live: true },
  MATCHED: { label: 'Closed', tone: 'grey' },
  LOCKED: { label: 'Closed', tone: 'grey' },
  RESOLVED: { label: 'Settled', tone: 'blue' },
  SETTLED: { label: 'Settled', tone: 'blue' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  DRAFT: { label: 'Not open yet', tone: 'grey' },
};

/* ---- Order status --------------------------------------------------------- */

/**
 * There is no WON or LOST.
 *
 * A settled position came back worth more than it cost, less than it cost, or
 * exactly what it cost. SETTLED_FLAT is a real outcome - it happens whenever
 * the admin declares a final value exactly equal to the share price.
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING', // waiting for an opponent
  PARTIALLY_MATCHED: 'PARTIALLY_MATCHED',
  FULLY_MATCHED: 'FULLY_MATCHED',
  REFUNDED: 'REFUNDED', // unmatched shares returned
  CANCELLED: 'CANCELLED', // whole contest cancelled, everything returned
  SETTLED_PROFIT: 'SETTLED_PROFIT',
  SETTLED_LOSS: 'SETTLED_LOSS',
  SETTLED_FLAT: 'SETTLED_FLAT',
};

export const ORDER_STATUS_META = {
  PENDING: { label: 'Waiting for opponent', tone: 'yellow' },
  PARTIALLY_MATCHED: { label: 'Partially matched', tone: 'yellow' },
  FULLY_MATCHED: { label: 'Fully matched', tone: 'green' },
  REFUNDED: { label: 'Unmatched refunded', tone: 'blue' },
  CANCELLED: { label: 'Cancelled & refunded', tone: 'red' },
  SETTLED_PROFIT: { label: 'Settled - profit', tone: 'green' },
  SETTLED_LOSS: { label: 'Settled - loss', tone: 'red' },
  SETTLED_FLAT: { label: 'Settled - no change', tone: 'neutral' },
};

/* ---- Wallet transaction types (spec section 15) --------------------------- */

export const TX_TYPE = {
  ADMIN_CREDIT: 'ADMIN_CREDIT',
  ADMIN_DEBIT: 'ADMIN_DEBIT',
  CONTEST_ENTRY: 'CONTEST_ENTRY',
  SIMULATED_CHARGE: 'SIMULATED_CHARGE',
  MATCHED_STAKE: 'MATCHED_STAKE',
  UNMATCHED_REFUND: 'UNMATCHED_REFUND',
  CONTEST_CANCEL_REFUND: 'CONTEST_CANCEL_REFUND',
  SETTLEMENT_PROFIT: 'SETTLEMENT_PROFIT',
  SETTLEMENT_LOSS: 'SETTLEMENT_LOSS',
  SETTLEMENT_FLAT: 'SETTLEMENT_FLAT',
};

export const TX_TYPE_META = {
  ADMIN_CREDIT: { label: 'Tokens added by admin', tone: 'green', sign: 1 },
  ADMIN_DEBIT: { label: 'Tokens removed by admin', tone: 'red', sign: -1 },
  CONTEST_ENTRY: { label: 'Contest entry', tone: 'neutral', sign: -1 },
  SIMULATED_CHARGE: { label: '10% simulated charge', tone: 'neutral', sign: -1 },
  MATCHED_STAKE: { label: 'Stake locked into match', tone: 'neutral', sign: 0 },
  UNMATCHED_REFUND: { label: 'Unmatched shares refunded', tone: 'blue', sign: 1 },
  CONTEST_CANCEL_REFUND: { label: 'Contest cancelled - refund', tone: 'blue', sign: 1 },
  /* All three are credits: settlement always returns whatever the shares
     turned out to be worth, even on a losing position. Whether it was a good
     day is in the note, and in the P&L column on the history screen. */
  SETTLEMENT_PROFIT: { label: 'Settled - shares returned', tone: 'green', sign: 1 },
  SETTLEMENT_LOSS: { label: 'Settled - shares returned', tone: 'red', sign: 1 },
  SETTLEMENT_FLAT: { label: 'Settled - stake returned', tone: 'neutral', sign: 1 },
};

/* ---- WebSocket events (spec section 8) ------------------------------------ */

export const WS_EVENT = {
  PARTIAL_MATCH: 'PARTIAL_MATCH',
  FULL_MATCH: 'FULL_MATCH',
  NEW_OPPONENT_MATCHED: 'NEW_OPPONENT_MATCHED',
  UNMATCHED_REFUND: 'UNMATCHED_REFUND',
  CONTEST_CANCELLED: 'CONTEST_CANCELLED',
  CONTEST_LOCKED: 'CONTEST_LOCKED',
  CONTEST_RESOLVED: 'CONTEST_RESOLVED',
  SETTLEMENT_COMPLETED: 'SETTLEMENT_COMPLETED',
  WALLET_UPDATED: 'WALLET_UPDATED',
};

/* Default user-facing copy for each event. The backend may override `message`. */
export const WS_EVENT_COPY = {
  PARTIAL_MATCH: { title: 'Partially matched', tone: 'info' },
  FULL_MATCH: { title: 'Opponent found', tone: 'success' },
  NEW_OPPONENT_MATCHED: { title: 'New opponent joined', tone: 'success' },
  UNMATCHED_REFUND: { title: 'Unmatched shares refunded', tone: 'info' },
  CONTEST_CANCELLED: { title: 'Contest cancelled', tone: 'warning' },
  CONTEST_LOCKED: { title: 'Contest locked', tone: 'info' },
  CONTEST_RESOLVED: { title: 'Result declared', tone: 'info' },
  SETTLEMENT_COMPLETED: { title: 'Settlement completed', tone: 'success' },
  WALLET_UPDATED: { title: 'Wallet updated', tone: 'info' },
};

/* ---- Business rules ------------------------------------------------------- */

/** Simulated project charge. NOT a tax. Mirrors the backend value. */
export const CHARGE_RATE = 0.1;

/** Quick-pick share quantities shown under the stepper. */
export const QUICK_SHARE_PICKS = [1, 5, 10, 25, 50];

export const MAX_SHARES_PER_ORDER = 999;
