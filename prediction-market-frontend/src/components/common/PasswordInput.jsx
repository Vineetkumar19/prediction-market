/**
 * PasswordInput.jsx
 * Password field with a show/hide toggle. Used on login, register and the
 * change-password form.
 */

import { useState } from 'react';
import { IconEye, IconEyeOff } from './Icons';

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Enter your password',
  invalid = false,
  autoComplete = 'current-password',
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-affix">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`input ${invalid ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="input-affix__btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
