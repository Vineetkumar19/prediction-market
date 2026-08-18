/**
 * Spinner.jsx + LoadingBlock
 * LoadingBlock is the full-section loading state used while a page fetches.
 */

export default function Spinner({ large = false, className = '' }) {
  return <span className={`spinner ${large ? 'spinner--lg' : ''} ${className}`} role="status" aria-label="Loading" />;
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <div className="loader-block">
      <Spinner large />
      <span className="small">{label}</span>
    </div>
  );
}

/** Grey shimmering placeholders shaped like contest cards. */
export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="contest-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="contest-card" aria-hidden="true">
          <div className="skeleton" style={{ aspectRatio: '16 / 9', borderRadius: 0 }} />
          <div className="contest-card__body">
            <div className="skeleton" style={{ height: 10, width: '40%' }} />
            <div className="skeleton" style={{ height: 16, width: '95%' }} />
            <div className="skeleton" style={{ height: 16, width: '70%' }} />
            <div className="skeleton" style={{ height: 58, marginTop: 'auto' }} />
            <div className="skeleton" style={{ height: 52 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
