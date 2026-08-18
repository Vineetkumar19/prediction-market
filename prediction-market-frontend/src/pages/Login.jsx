/**
 * Login.jsx
 * User ID + password. There is no email on this system, so the screen makes
 * the "write down your credentials" warning impossible to miss - if a user
 * forgets their password the admin has to reset it manually.
 */

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import PasswordInput from '../components/common/PasswordInput';
import { validatePassword, validateUserId } from '../utils/validators';
import { IconAlert, IconCheck, IconTrendUp } from '../components/common/Icons';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ userId: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {
      userId: validateUserId(form.userId),
      password: validatePassword(form.password),
    };
    setErrors(nextErrors);
    if (nextErrors.userId || nextErrors.password) return;

    setSubmitting(true);
    try {
      const user = await login(form.userId, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error('Login failed', err.message);
      setErrors({ password: 'Check your User ID and password' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      {/* ---- left panel (hidden on phones) ---- */}
      <aside className="auth__aside">
        <div className="brand">
          <span className="brand__mark">
            <IconTrendUp size={19} />
          </span>
          <span className="brand__text">
            <span>Prediction Market</span>
            <span className="brand__sub">Simulator</span>
          </span>
        </div>

        <div>
          <h1 className="auth__headline">Call it right. Win the tokens.</h1>
          <p className="auth__lede">
            A private prediction game for your friend circle. Pick a side, take your shares, and see
            who reads the outcome best.
          </p>

          <div className="auth__points">
            {[
              'Every question has one fixed share price for both sides',
              'BUY says it goes above the target, SELL says it stays below',
              'Unmatched shares are refunded automatically, charge included',
              'Virtual tokens only - no real money anywhere in this app',
            ].map((point) => (
              <div className="auth__point" key={point}>
                <span className="auth__point-mark">
                  <IconCheck size={13} />
                </span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="tiny" style={{ opacity: 0.75 }}>
          Tokens are granted by the admin, cannot be bought, and cannot be exchanged for anything of
          value.
        </p>
      </aside>

      {/* ---- form ---- */}
      <main className="auth__form-side">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand__mark">
              <IconTrendUp size={19} />
            </span>
            <span className="brand__text">
              <span className="bold">Prediction Market</span>
              <span className="brand__sub">Simulator</span>
            </span>
          </div>

          <div className="auth-card__head">
            <h1 className="auth-card__title">Log in</h1>
            <p className="auth-card__sub">Use the User ID you created when you registered.</p>
          </div>

          {/* The warning the spec asks for, placed above the fields so it is read. */}
          <div className="remember-note">
            <span style={{ color: 'var(--yellow-700)', flexShrink: 0 }}>
              <IconAlert size={18} />
            </span>
            <span>
              <strong>Remember your User ID and password permanently.</strong>
              There is no email or phone number on this account, so there is no automatic password
              reset. If you forget it, only the admin can help you.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="stack stack-4" noValidate>
            <div className="field">
              <label className="label" htmlFor="userId">
                User ID
              </label>
              <input
                id="userId"
                className={`input ${errors.userId ? 'is-invalid' : ''}`}
                value={form.userId}
                onChange={set('userId')}
                placeholder="e.g. rahul_07"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                autoFocus
              />
              {errors.userId && (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.userId}
                </span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={set('password')}
                invalid={Boolean(errors.password)}
              />
              {errors.password && (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.password}
                </span>
              )}
            </div>

            <Button type="submit" size="lg" block loading={submitting}>
              Log in
            </Button>
          </form>

          <p className="auth-card__foot">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
