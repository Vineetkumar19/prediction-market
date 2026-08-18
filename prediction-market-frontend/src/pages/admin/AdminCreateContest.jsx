/**
 * AdminCreateContest.jsx
 * Adds one question to an existing event, with a live preview of the card the
 * players will see.
 *
 * Every question must belong to an event - create the event first on the
 * Events tab.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import * as adminService from '../../api/adminService';
import { formatTokens, toDateTimeLocal } from '../../utils/format';
import { isClean, validatePositiveNumber, validateRequired } from '../../utils/validators';
import { CHARGE_RATE } from '../../utils/constants';
import { IconAlert, IconGrid, IconInfo } from '../../components/common/Icons';

const hoursFromNow = (h) => toDateTimeLocal(new Date(Date.now() + h * 3600 * 1000));

export default function AdminCreateContest() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: events, loading: loadingEvents } = useAsync(adminService.fetchAdminEvents, []);

  const [form, setForm] = useState({
    eventId: '',
    question: '',
    imageUrl: '',
    sharePrice: 50,
    startTime: toDateTimeLocal(new Date()),
    matchingDeadline: hoursFromNow(24),
    endTime: hoursFromNow(48),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: null }));
  };

  const charge = useMemo(
    () => Math.round(Number(form.sharePrice || 0) * CHARGE_RATE),
    [form.sharePrice]
  );

  const validate = () => {
    const next = {
      eventId: validateRequired(form.eventId, 'Event'),
      question: validateRequired(form.question, 'Question'),
      sharePrice: validatePositiveNumber(form.sharePrice, 'Share price'),
      matchingDeadline:
        new Date(form.matchingDeadline) <= new Date(form.startTime)
          ? 'The deadline must be after the start time'
          : null,
      endTime:
        new Date(form.endTime) < new Date(form.matchingDeadline)
          ? 'The question cannot end before its deadline'
          : null,
    };
    setErrors(next);
    return isClean(next);
  };

  const submit = async (publish) => {
    if (!validate()) {
      toast.error('Check the form', 'Some required fields are missing or invalid.');
      return;
    }
    setSaving(true);
    try {
      await adminService.createContest({
        ...form,
        sharePrice: Math.floor(Number(form.sharePrice)),
        startTime: new Date(form.startTime).toISOString(),
        matchingDeadline: new Date(form.matchingDeadline).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        publish,
      });
      toast.success(
        publish ? 'Question published' : 'Draft saved',
        publish ? 'It is now live inside its event.' : 'Publish it when you are ready.'
      );
      navigate('/admin/contests');
    } catch (err) {
      toast.error('Could not save question', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEvents && !events) return <LoadingBlock label="Loading events..." />;

  if (!events?.length) {
    return (
      <EmptyState
        icon={<IconGrid size={24} />}
        title="Create an event first"
        text="Every question belongs to an event, for example 'India vs Pakistan'. Create the event, then come back and add questions to it."
        actionLabel="Go to Events"
        actionTo="/admin/events"
      />
    );
  }

  return (
    <div className="detail-layout">
      {/* ---------------- form ---------------- */}
      <form
        className="card card-pad stack stack-5"
        style={{ gap: 'var(--s-5)' }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
        noValidate
      >
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Question details
        </h3>

        <div className="field">
          <label className="label" htmlFor="eventId">
            Which event does this belong to?
          </label>
          <select
            id="eventId"
            className={`select ${errors.eventId ? 'is-invalid' : ''}`}
            value={form.eventId}
            onChange={set('eventId')}
          >
            <option value="">Choose an event...</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} - {e.label}
              </option>
            ))}
          </select>
          {errors.eventId && (
            <span className="field-error">
              <IconAlert size={13} /> {errors.eventId}
            </span>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="question">
            Question shown to players
          </label>
          <textarea
            id="question"
            className={`textarea ${errors.question ? 'is-invalid' : ''}`}
            value={form.question}
            onChange={set('question')}
            placeholder="How many runs will Jos Buttler score?"
            maxLength={160}
          />
          <div className="row row-between">
            {errors.question ? (
              <span className="field-error">
                <IconAlert size={13} /> {errors.question}
              </span>
            ) : (
              <span className="field-hint">
                Ask for a number, not a yes or no - "how many runs", "what will the partnership be".
              </span>
            )}
            <span className="tiny muted">{form.question.length}/160</span>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="sharePrice">
            Share price / the line (tokens)
          </label>
          <input
            id="sharePrice"
            type="number"
            min="1"
            className={`input mono ${errors.sharePrice ? 'is-invalid' : ''}`}
            value={form.sharePrice}
            onChange={set('sharePrice')}
          />
          {errors.sharePrice ? (
            <span className="field-error">
              <IconAlert size={13} /> {errors.sharePrice}
            </span>
          ) : (
            <span className="field-hint">
              This one number is both the price and the line. At{' '}
              {formatTokens(form.sharePrice)} the question is "more or less than{' '}
              {formatTokens(form.sharePrice)}?", one share costs{' '}
              {formatTokens(form.sharePrice)} + {charge} charge ={' '}
              {formatTokens(Number(form.sharePrice) + charge)} tokens, and the most anyone can gain
              or lose per share is {formatTokens(form.sharePrice)}.
            </span>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="imageUrl">
            Question image URL (optional)
          </label>
          <input
            id="imageUrl"
            className="input"
            value={form.imageUrl}
            onChange={set('imageUrl')}
            placeholder="https://..."
          />
          <span className="field-hint">
            Leave empty for a clean text-only card - the event already has its own image.
          </span>
        </div>

        <hr className="divider" />

        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Timing
        </h3>

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="startTime">
              Start time
            </label>
            <input
              id="startTime"
              type="datetime-local"
              className="input"
              value={form.startTime}
              onChange={set('startTime')}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="matchingDeadline">
              Entry deadline
            </label>
            <input
              id="matchingDeadline"
              type="datetime-local"
              className={`input ${errors.matchingDeadline ? 'is-invalid' : ''}`}
              value={form.matchingDeadline}
              onChange={set('matchingDeadline')}
            />
            {errors.matchingDeadline ? (
              <span className="field-error">
                <IconAlert size={13} /> {errors.matchingDeadline}
              </span>
            ) : (
              <span className="field-hint">Last moment a player can enter.</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="endTime">
              Result time
            </label>
            <input
              id="endTime"
              type="datetime-local"
              className={`input ${errors.endTime ? 'is-invalid' : ''}`}
              value={form.endTime}
              onChange={set('endTime')}
            />
            {errors.endTime ? (
              <span className="field-error">
                <IconAlert size={13} /> {errors.endTime}
              </span>
            ) : (
              <span className="field-hint">When you will declare the outcome.</span>
            )}
          </div>
        </div>

        <div className="notice">
          <span className="notice__icon">
            <IconInfo size={16} />
          </span>
          <span className="small">
            After the match you type the real number on the Questions tab and every matched share is
            revalued to it on the spot. This version reads no live scoring feed - the number is
            whatever you enter.
          </span>
        </div>

        <div className="row row-wrap">
          <Button type="submit" loading={saving}>
            Publish question
          </Button>
          <Button type="button" variant="ghost" onClick={() => submit(false)} disabled={saving}>
            Save as draft
          </Button>
          <Button type="button" variant="subtle" to="/admin/contests" disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>

      {/* ---------------- live preview ---------------- */}
      <aside className="entry-panel stack stack-4">
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Player preview
        </h3>

        <article className="contest-card">
          <div className="contest-card__body">
            <span className="chip-glass chip-glass--live" style={{ boxShadow: 'none', alignSelf: 'flex-start' }}>
              Open
            </span>
            <h3 className="contest-card__question">
              {form.question || 'Your question will appear here'}
            </h3>
            <div className="side-buttons">
              <div className="side-btn side-btn--yes">
                <span className="side-btn__label">BUY</span>
                <span className="side-btn__hint">
                  above {formatTokens(form.sharePrice)}
                </span>
              </div>
              <div className="side-btn side-btn--no">
                <span className="side-btn__label">SELL</span>
                <span className="side-btn__hint">
                  {formatTokens(form.sharePrice)} or below
                </span>
              </div>
            </div>
          </div>
        </article>

        <div className="panel-quiet">
          <span className="tiny muted">
            The BUY and SELL descriptions are generated from the price, so they can never disagree
            with the number settlement actually uses. Players never see how many shares are on each
            side, how many are matched, or who else joined - only their own position.
          </span>
        </div>
      </aside>
    </div>
  );
}
