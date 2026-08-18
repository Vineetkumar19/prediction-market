/**
 * ToastStack.jsx
 * Rendered once by ToastProvider. Sits above the bottom navigation on phones.
 */

import { IconAlert, IconCheckCircle, IconInfo, IconX, IconXCircle } from './Icons';

const ICONS = {
  success: <IconCheckCircle size={20} />,
  error: <IconXCircle size={20} />,
  warning: <IconAlert size={20} />,
  info: <IconInfo size={20} />,
};

const ICON_COLOUR = {
  success: 'var(--green-600)',
  error: 'var(--red-600)',
  warning: 'var(--amber-500)',
  info: 'var(--blue-500)',
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <span className="toast__icon" style={{ color: ICON_COLOUR[t.tone] }}>
            {ICONS[t.tone] || ICONS.info}
          </span>
          <div className="toast__body">
            {t.title && <div className="toast__title">{t.title}</div>}
            {t.message && <div className="toast__msg">{t.message}</div>}
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            <IconX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
