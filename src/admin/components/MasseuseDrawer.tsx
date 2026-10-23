import { useEffect, useState, type FormEvent } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Switch } from '../../components/ui/Switch';
import { errorMessage, saveMasseuse } from '../../lib/api';
import type { Masseuse } from '../../lib/types';

interface Props {
  open: boolean;
  masseuse: Masseuse | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function MasseuseDrawer({ open, masseuse, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(masseuse?.name ?? '');
    setTitle(masseuse?.title ?? '');
    setSpecialties(masseuse?.specialties ?? '');
    setBio(masseuse?.bio ?? '');
    setPhoto(masseuse?.photo_url ?? '');
    setActive(masseuse?.is_active ?? true);
    setError(null);
    setTouched(false);
  }, [open, masseuse]);

  const nameError = name.trim().length < 2 ? 'Enter the masseuse’s name.' : null;
  const photoError = photo.trim() && !/^https?:\/\//i.test(photo.trim()) ? 'Photo must be a full https:// image URL.' : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || photoError) return;
    setSaving(true);
    setError(null);
    try {
      await saveMasseuse(
        {
          name: name.trim(),
          title: title.trim() || null,
          specialties: specialties.trim() || null,
          bio: bio.trim() || null,
          photo_url: photo.trim() || null,
          is_active: active,
        },
        masseuse?.id,
      );
      onSaved(masseuse ? `${name.trim()}’s profile updated.` : `${name.trim()} added to the team.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={masseuse ? 'Edit masseuse' : 'Add masseuse'}
      subtitle="Clients can choose an active masseuse when they book."
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="masseuse-form" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <span className="spinner" /> : masseuse ? 'Save changes' : 'Add masseuse'}
          </button>
        </>
      }
    >
      <form id="masseuse-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span className="field-label">Full name</span>
          <input className={`input ${touched && nameError ? 'has-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {touched && nameError && <span className="field-error">{nameError}</span>}
        </label>
        <label className="field">
          <span className="field-label">Title <span className="optional">Optional</span></span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Licensed Massage Therapist" />
        </label>
        <label className="field">
          <span className="field-label">Specialties <span className="optional">Optional</span></span>
          <input className="input" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="e.g. Deep tissue, sports recovery" />
        </label>
        <label className="field">
          <span className="field-label">Short bio <span className="optional">Optional</span></span>
          <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} />
        </label>
        <label className="field">
          <span className="field-label">Photo URL <span className="optional">Optional</span></span>
          <input className={`input ${touched && photoError ? 'has-error' : ''}`} value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" inputMode="url" />
          {touched && photoError ? <span className="field-error">{photoError}</span> : <span className="field-hint">Leave blank to show their initials.</span>}
        </label>
        <div className="toggle-card">
          <div>
            <strong>Accepting bookings</strong>
            <span>Inactive masseuses are hidden from clients and not assigned new sessions.</span>
          </div>
          <Switch checked={active} onChange={setActive} ariaLabel="Active" />
        </div>
      </form>
    </Drawer>
  );
}
