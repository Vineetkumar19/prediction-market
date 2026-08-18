/**
 * ShareStepper.jsx
 * The +/- share quantity control with quick-pick buttons underneath.
 * Quantities are always whole numbers - the spec forbids fractional shares.
 */

import { MAX_SHARES_PER_ORDER, QUICK_SHARE_PICKS } from '../../utils/constants';

export default function ShareStepper({ value, onChange, max = MAX_SHARES_PER_ORDER, disabled = false }) {
  const clamp = (n) => Math.min(max, Math.max(1, Math.floor(Number(n) || 1)));

  return (
    <div className="stack stack-3">
      <div className="stepper">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={disabled || value <= 1}
          aria-label="One share fewer"
        >
          &minus;
        </button>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? '' : clamp(e.target.value))}
          onBlur={(e) => onChange(clamp(e.target.value))}
          aria-label="Number of shares"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={disabled || value >= max}
          aria-label="One share more"
        >
          +
        </button>
      </div>

      <div className="quick-picks">
        {QUICK_SHARE_PICKS.filter((n) => n <= max).map((n) => (
          <button
            key={n}
            type="button"
            className={`quick-pick ${Number(value) === n ? 'is-active' : ''}`}
            onClick={() => onChange(n)}
            disabled={disabled}
          >
            {n}
          </button>
        ))}
        {max > 0 && (
          <button
            type="button"
            className="quick-pick"
            onClick={() => onChange(clamp(max))}
            disabled={disabled}
            title="The most shares your balance allows"
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
}
