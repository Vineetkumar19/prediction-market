/**
 * AdminEvents.jsx
 * Create the real-world events players see on the home screen, and open or
 * close them. An event is just an image, a title and a label - the questions
 * live inside it and are created on the Questions tab.
 */

import { useState } from 'react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import ContestImage from '../../components/contest/ContestImage';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import * as adminService from '../../api/adminService';
import { formatDateShort } from '../../utils/format';
import { EVENT_STATUS } from '../../utils/constants';
import { IconAlert, IconGrid, IconPlus } from '../../components/common/Icons';

const EMPTY_FORM = { title: '', label: '', imageUrl: '' };

export default function AdminEvents() {
  const { data: events, loading, reload } = useAsync(adminService.fetchAdminEvents, []);
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: null }));
  };

  const submit = async () => {
    const next = {
      title: form.title.trim() ? null : 'Event title is required',
      label: form.label.trim() ? null : 'Label is required',
    };
    setErrors(next);
    if (next.title || next.label) return;

    setSaving(true);
    try {
      await adminService.createEvent(form);
      toast.success('Event created', 'Now add questions to it from the Questions tab.');
      setCreating(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      toast.error('Could not create event', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (event) => {
    try {
      await adminService.toggleEvent(event.id);
      reload();
    } catch (err) {
      toast.error('Could not update event', err.message);
    }
  };

  if (loading && !events) return <LoadingBlock label="Loading events..." />;

  return (
    <div className="stack stack-5" style={{ gap: 'var(--s-5)' }}>
      <div className="row row-between row-wrap">
        <span className="small muted">{events?.length || 0} events</span>
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => setCreating(true)}>
          New event
        </Button>
      </div>

      {!events?.length ? (
        <EmptyState
          icon={<IconGrid size={24} />}
          title="No events yet"
          text="An event is the match or market players see on the home screen, for example 'India vs Pakistan'. Create one, then add questions to it."
          actionLabel="Create an event"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="event-grid">
          {events.map((e) => (
            <div className="event-card" key={e.id} style={{ cursor: 'default' }}>
              <div className="event-card__media">
                <ContestImage src={e.imageUrl} alt="" letter={e.title} />
                <div className="event-card__media-top">
                  <Badge tone={e.status === EVENT_STATUS.OPEN ? 'green' : 'grey'}>
                    {e.status === EVENT_STATUS.OPEN ? 'Open' : 'Closed'}
                  </Badge>
                  <span className="chip-glass">
                    {e.questionCount} {e.questionCount === 1 ? 'question' : 'questions'}
                  </span>
                </div>
              </div>
              <div className="event-card__body">
                <h3 className="event-card__title">{e.title}</h3>
                <p className="event-card__label">{e.label}</p>
                <p className="tiny muted">Created {formatDateShort(e.createdAt)}</p>
                <div className="row" style={{ gap: 6, marginTop: 'var(--s-3)' }}>
                  <Button size="sm" variant="subtle" onClick={() => toggle(e)}>
                    {e.status === EVENT_STATUS.OPEN ? 'Close event' : 'Reopen event'}
                  </Button>
                  <Button size="sm" variant="ghost" to="/admin/contests/new">
                    Add question
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- create ---- */}
      <Modal
        open={creating}
        title="New event"
        onClose={() => !saving && setCreating(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving}>
              Create event
            </Button>
          </>
        }
      >
        <div className="stack stack-4">
          <div className="field">
            <label className="label" htmlFor="eventTitle">
              Event title
            </label>
            <input
              id="eventTitle"
              className={`input ${errors.title ? 'is-invalid' : ''}`}
              value={form.title}
              onChange={set('title')}
              placeholder="India vs Pakistan"
              autoFocus
            />
            {errors.title ? (
              <span className="field-error">
                <IconAlert size={13} /> {errors.title}
              </span>
            ) : (
              <span className="field-hint">The big text players see on the card.</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="eventLabel">
              Label
            </label>
            <input
              id="eventLabel"
              className={`input ${errors.label ? 'is-invalid' : ''}`}
              value={form.label}
              onChange={set('label')}
              placeholder="T20 World Cup - Super 4"
            />
            {errors.label ? (
              <span className="field-error">
                <IconAlert size={13} /> {errors.label}
              </span>
            ) : (
              <span className="field-hint">The smaller line under the title. Your wording.</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="eventImage">
              Image URL
            </label>
            <input
              id="eventImage"
              className="input"
              value={form.imageUrl}
              onChange={set('imageUrl')}
              placeholder="https://..."
            />
            <span className="field-hint">
              Optional. If empty, a yellow tile with the first letter is used.
            </span>
          </div>

          <div className="image-preview">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" />
            ) : (
              <span className="tiny">Image preview</span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
