/**
 * format.js
 * Display helpers. Nothing here changes data, it only makes it readable.
 */

import { CHARGE_RATE } from './constants';

/* ---- Numbers -------------------------------------------------------------- */

/** 12345 -> "12,345" (Indian digit grouping) */
export function formatTokens(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Adds a sign in front: 250 -> "+250", -250 -> "-250" */
export function formatSigned(value) {
  const n = Number(value ?? 0);
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${formatTokens(Math.abs(n))}`;
}

/** 25000 -> "25,000" for contest target values. */
export function formatTarget(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(value);
}

/* ---- The core entry calculation (mirrors backend spec section 5) ---------- */

/**
 * The backend is always authoritative. This is only for instant UI feedback
 * so the user sees the cost before submitting.
 */
export function calculateEntry(sharePrice, shares) {
  const price = Number(sharePrice) || 0;
  const qty = Math.max(0, Math.floor(Number(shares) || 0));
  const baseAmount = price * qty;
  const charge = Math.round(baseAmount * CHARGE_RATE);
  return {
    shares: qty,
    baseAmount,
    charge,
    totalDebit: baseAmount + charge,
  };
}

/* ---- Settlement preview (mirrors BusinessRules.java) ---------------------- */

/**
 * What one BOUGHT share is worth once the final value is known, clamped to the
 * collateral standing behind it.
 *
 * The clamp is the whole reason this helper exists rather than a bare
 * subtraction: each side only staked `sharePrice` per share, so that is the
 * most either side can pay out. A player scoring 300 on a question priced at 50
 * settles identically to one scoring 100.
 *
 * Kept deliberately in step with BusinessRules.buyValuePerShare. The backend is
 * always authoritative; this only powers the preview numbers.
 */
export function buyValuePerShare(sharePrice, finalValue) {
  const price = Number(sharePrice) || 0;
  const value = Number(finalValue) || 0;
  if (value <= 0) return 0;
  return Math.min(value, price * 2);
}

/** Total tokens one position gets back. Includes the stake - a return, not a profit. */
export function settlementReturn(side, sharePrice, matchedShares, finalValue) {
  const price = Number(sharePrice) || 0;
  const shares = Math.max(0, Math.floor(Number(matchedShares) || 0));
  const buyValue = buyValuePerShare(price, finalValue);
  const perShare = side === 'YES' ? buyValue : price * 2 - buyValue;
  return perShare * shares;
}

/** Signed profit or loss on the matched shares. Excludes the 10% entry charge. */
export function settlementPnl(side, sharePrice, matchedShares, finalValue) {
  const price = Number(sharePrice) || 0;
  const shares = Math.max(0, Math.floor(Number(matchedShares) || 0));
  return settlementReturn(side, price, shares, finalValue) - price * shares;
}

/**
 * The most a position can gain or lose: one share price per share, either way.
 * Shown on the entry screen so nobody meets the cap for the first time at
 * settlement.
 */
export function maxSwing(sharePrice, shares) {
  const price = Number(sharePrice) || 0;
  const qty = Math.max(0, Math.floor(Number(shares) || 0));
  return price * qty;
}

/* ---- Dates & time --------------------------------------------------------- */

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateShort(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** "3 minutes ago", "in 2 hours" */
export function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);

  const units = [
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      const value = Math.round(diffMs / ms);
      try {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(value, unit);
      } catch {
        return `${Math.abs(value)} ${unit}${Math.abs(value) === 1 ? '' : 's'} ${
          diffMs < 0 ? 'ago' : 'from now'
        }`;
      }
    }
  }
  return '';
}

/**
 * Countdown text for a deadline.
 * Returns { text, expired, urgent } - urgent when under 30 minutes remain.
 */
export function formatCountdown(iso) {
  if (!iso) return { text: '-', expired: false, urgent: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: '-', expired: false, urgent: false };
  if (ms <= 0) return { text: 'Closed', expired: true, urgent: false };

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let text;
  if (days > 0) text = `${days}d ${hours}h left`;
  else if (hours > 0) text = `${hours}h ${minutes}m left`;
  else if (minutes > 0) text = `${minutes}m ${seconds}s left`;
  else text = `${seconds}s left`;

  return { text, expired: false, urgent: ms < 30 * 60 * 1000 };
}

/** Converts a Date to the value format an <input type="datetime-local"> wants. */
export function toDateTimeLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ---- Misc ----------------------------------------------------------------- */

export function initialsOf(name = '') {
  // Strip anything that is not a letter or digit first, so a name like
  // "Vineet (Admin)" gives "VA" rather than "V(".
  const parts = String(name)
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function percent(part, whole) {
  const p = Number(part) || 0;
  const w = Number(whole) || 0;
  if (w <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((p / w) * 100)));
}

export function pluralise(count, singular, plural) {
  return Number(count) === 1 ? singular : plural || `${singular}s`;
}
