/**
 * validators.js
 * Client-side validation only. The backend must repeat every one of these
 * checks - never trust the browser.
 */

export const USER_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;

export function validateUserId(value) {
  const v = String(value || '').trim();
  if (!v) return 'User ID is required';
  if (v.length < 4) return 'User ID must be at least 4 characters';
  if (v.length > 20) return 'User ID must be 20 characters or fewer';
  if (!USER_ID_PATTERN.test(v)) return 'Use only letters, numbers and underscore';
  return null;
}

export function validateName(value) {
  const v = String(value || '').trim();
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name is too short';
  if (v.length > 40) return 'Name must be 40 characters or fewer';
  return null;
}

export function validatePassword(value) {
  const v = String(value || '');
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  if (v.length > 64) return 'Password is too long';
  return null;
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please re-enter your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export function validateShares(shares, maxAffordable) {
  const n = Number(shares);
  if (!Number.isFinite(n) || n <= 0) return 'Enter at least 1 share';
  if (!Number.isInteger(n)) return 'Shares must be a whole number';
  if (maxAffordable !== undefined && n > maxAffordable) {
    return 'Not enough tokens for this many shares';
  }
  return null;
}

export function validateRequired(value, label = 'This field') {
  return String(value ?? '').trim() ? null : `${label} is required`;
}

export function validatePositiveNumber(value, label = 'Value') {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (n <= 0) return `${label} must be greater than zero`;
  return null;
}

/** Returns true only when every value in the errors object is null/undefined. */
export function isClean(errors) {
  return Object.values(errors).every((e) => !e);
}
