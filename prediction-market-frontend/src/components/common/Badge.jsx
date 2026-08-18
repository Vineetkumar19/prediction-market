/**
 * Badge.jsx
 * Small status pill. `tone` maps to the colour families in components.css.
 */

export default function Badge({ tone = 'neutral', children, dot = false, live = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {(dot || live) && <span className={`badge-dot ${live ? 'badge-dot--live' : ''}`} />}
      {children}
    </span>
  );
}
