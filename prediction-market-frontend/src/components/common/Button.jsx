/**
 * Button.jsx
 * One button component so sizes, loading states and disabled behaviour are
 * consistent everywhere. Renders a <Link> when `to` is given.
 */

import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'btn',
  yes: 'btn btn-yes',
  no: 'btn btn-no',
  ghost: 'btn btn-ghost',
  subtle: 'btn btn-subtle',
  dangerGhost: 'btn btn-danger-ghost',
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  icon = null,
  to,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? (
        <span
          className={`spinner ${variant === 'yes' || variant === 'no' ? 'spinner--on-solid' : ''}`}
          style={{ width: 16, height: 16, borderWidth: 2 }}
        />
      ) : (
        icon
      )}
      {children}
    </>
  );

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
