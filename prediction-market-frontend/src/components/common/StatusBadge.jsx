/**
 * StatusBadge.jsx
 * Turns a raw backend enum into a readable, colour-coded pill.
 */

import Badge from './Badge';
import {
  CONTEST_STATUS,
  CONTEST_STATUS_META,
  ORDER_STATUS_META,
  PLAYER_STATUS_META,
} from '../../utils/constants';

/**
 * What players see. Deliberately coarse - it never reveals that other people
 * have already matched. Use ContestStatusBadge on admin screens only.
 */
export function PlayerStatusBadge({ status }) {
  const meta = PLAYER_STATUS_META[status] || { label: status, tone: 'neutral' };
  return (
    <Badge tone={meta.tone} dot live={Boolean(meta.live)}>
      {meta.label}
    </Badge>
  );
}

/** Admin-only: shows the true lifecycle status. */
export function ContestStatusBadge({ status }) {
  const meta = CONTEST_STATUS_META[status] || { label: status, tone: 'neutral' };
  const live = status === CONTEST_STATUS.OPEN || status === CONTEST_STATUS.PARTIAL;
  return (
    <Badge tone={meta.tone} dot live={live}>
      {meta.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status }) {
  const meta = ORDER_STATUS_META[status] || { label: status, tone: 'neutral' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
