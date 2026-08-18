/**
 * Register.jsx
 * Exactly three fields, as asked: name, a User ID the player chooses, and a
 * password. No email, no phone, no OTP.
 *
 * Because there is no recovery channel, the screen forces the user to tick a
 * box confirming they have saved their credentials before the button unlocks.
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import PasswordInput from '../components/common/PasswordInput';
import {
  validateConfirmPassword,
  validateName,
  validatePassword,
  validateUserId,
  isClean,
} from '../utils/validators';
import { IconAlert, IconCheck, IconTrendUp } from '../components/common/Icons';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', userId: '', password: '', confirm: '' });
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const set = (key) => (e) => {
    const value = key === 'userId' ? e.target.value.replace(/\s/g, '') : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((x) => ({ ...x, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {
      name: validateName(form.name),
      userId: validateUserId(form.userId),
      password: validatePassword(form.password),
      confirm: validateConfirmPassword(form.password, form.confirm),
    };
    setErrors(nextErrors);
    if (!isClean(nextErrors)) return;

    setSubmitting(true);
    try {
      await register({ name: form.name, userId: form.userId, password: form.password });
      toast.success(
        'Account created',
        'Ask the admin to credit your virtual tokens so you can join a contest.'
      );
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('Could not register', err.message);
      if (err.status === 409) setErrors({ userId: 'That User ID is already taken' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
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
          <h1 className="auth__headline">Three fields. That is the whole signup.</h1>
          <p className="auth__lede">
            Your name, a User ID you pick yourself, and a password. Nothing else is collected.
          </p>

          <div className="auth__points">
            {[
              'No email, no phone number, no verification code',
              'The admin credits your starting tokens after you register',
              'Your User ID is how the admin finds you to send tokens',
              'Keep your password safe - it cannot be reset automatically',
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
          Virtual tokens only. Nothing in this app can be bought, sold or cashed out.
        </p>
      </aside>

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
            <h1 className="auth-card__title">Create your account</h1>
            <p className="auth-card__sub">Pick a User ID you will remember - you cannot change it later.</p>
          </div>

          <form onSubmit={handleSubmit} className="stack stack-4" noValidate>
            <div className="field">
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                className={`input ${errors.name ? 'is-invalid' : ''}`}
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                autoFocus
              />
              {errors.name && (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.name}
                </span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="newUserId">
                Choose a User ID
              </label>
              <input
                id="newUserId"
                className={`input ${errors.userId ? 'is-invalid' : ''}`}
                value={form.userId}
                onChange={set('userId')}
                placeholder="e.g. rahul_07"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
              />
              {errors.userId ? (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.userId}
                </span>
              ) : (
                <span className="field-hint">
                  4 to 20 characters. Letters, numbers and underscore only.
                </span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="newPassword">
                Password
              </label>
              <PasswordInput
                id="newPassword"
                value={form.password}
                onChange={set('password')}
                invalid={Boolean(errors.password)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.password}
                </span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="confirmPassword">
                Re-enter password
              </label>
              <PasswordInput
                id="confirmPassword"
                value={form.confirm}
                onChange={set('confirm')}
                invalid={Boolean(errors.confirm)}
                placeholder="Type it again"
                autoComplete="new-password"
              />
              {errors.confirm && (
                <span className="field-error">
                  <IconAlert size={13} /> {errors.confirm}
                </span>
              )}
            </div>

            <div className="remember-note">
              <span style={{ color: 'var(--yellow-700)', flexShrink: 0 }}>
                <IconAlert size={18} />
              </span>
              <span>
                <strong>Write your User ID and password down now.</strong>
                This account has no email attached, so there is no "forgot password" link. If you
                lose these details the admin has to create a new account for you.
              </span>
            </div>

            <label
              className="row"
              style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--yellow-600)' }}
              />
              <span>I have saved my User ID and password somewhere safe.</span>
            </label>

            <Button type="submit" size="lg" block loading={submitting} disabled={!acknowledged}>
              Create account
            </Button>
          </form>

          <p className="auth-card__foot">
            Already registered? <Link to="/login">Log in instead</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
