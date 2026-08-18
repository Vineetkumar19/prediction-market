/**
 * EmptyState.jsx
 * Used whenever a list has nothing in it. Always says what the user can do
 * next rather than just "no data".
 */

import { IconInbox } from './Icons';
import Button from './Button';

export default function EmptyState({
  icon = <IconInbox size={26} />,
  title = 'Nothing here yet',
  text,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {actionLabel && (
        <Button size="sm" to={actionTo} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
