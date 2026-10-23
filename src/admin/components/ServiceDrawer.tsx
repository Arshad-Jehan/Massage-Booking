import { useEffect, useState, type FormEvent } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Switch } from '../../components/ui/Switch';
import { errorMessage, saveService } from '../../lib/api';
import type { Service } from '../../lib/types';

interface Props {
  open: boolean;
  service: Service | null; // null = create
  onClose: () => void;
  onSaved: (message: string) => void;
}

const DURATIONS = [30, 45, 60, 75, 90, 120];

export function ServiceDrawer({ open, service, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? '');
    setDescription(service?.description ?? '');
    setDuration(String(service?.duration_minutes ?? 60));
    setPrice(service ? String(service.price) : '');
    setActive(service?.is_active ?? true);
    setError(null);
    setTouched(false);
  }, [open, service]);

  const durationNum = Number(duration);
  const priceNum = Number(price);
  const errors = {
    name: name.trim().length < 2 ? 'Give the service a name.' : null,
    duration: !Number.isInteger(durationNum) || durationNum < 5 || durationNum > 480 ? 'Enter a duration between 5 and 480 minutes.' : null,
    price: price === '' || !Number.isFinite(priceNum) || priceNum < 0 ? 'Enter a price of 0 or more.' : null,
  };
  const valid = !errors.name && !errors.duration && !errors.price;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await saveService(
        { name: name.trim(), description: description.trim() || null, duration_minutes: durationNum, price: Math.round(priceNum * 100) / 100, is_active: active },
        service?.id,
      );
      onSaved(service ? `“${name.trim()}” updated.` : `“${name.trim()}” added to your menu.`);
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
      title={service ? 'Edit service' : 'New service'}
      subtitle={service ? 'Changes appear on the website and booking flow immediately.' : 'Active services appear instantly in the online booking flow.'}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="service-form" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <span className="spinner" /> : service ? 'Save changes' : 'Add service'}
          </button>
        </>
      }
    >
      <form id="service-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span className="field-label">Service name</span>
          <input className={`input ${touched && errors.name ? 'has-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deep Tissue Massage" autoFocus />
          {touched && errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className="field">
          <span className="field-label">Description <span className="optional">Shown on the website</span></span>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What clients can expect from this treatment…" maxLength={500} />
          <span className="field-hint">{description.length}/500</span>
        </label>
        <div className="field">
          <span className="field-label">Duration</span>
          <div className="chip-row">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className={`chip ${durationNum === d ? 'active' : ''}`} onClick={() => setDuration(String(d))}>
                {d} min
              </button>
            ))}
          </div>
          <span className="input-suffix">
            <input className={`input ${touched && errors.duration ? 'has-error' : ''}`} type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
            <span>minutes</span>
          </span>
          {touched && errors.duration && <span className="field-error">{errors.duration}</span>}
        </div>
        <label className="field">
          <span className="field-label">Price</span>
          <span className="input-prefix">
            <span>$</span>
            <input className={`input ${touched && errors.price ? 'has-error' : ''}`} type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </span>
          {touched && errors.price && <span className="field-error">{errors.price}</span>}
        </label>
        <div className="toggle-card">
          <div>
            <strong>Available for online booking</strong>
            <span>Inactive services stay in your dashboard but are hidden from clients.</span>
          </div>
          <Switch checked={active} onChange={setActive} ariaLabel="Active" />
        </div>
      </form>
    </Drawer>
  );
}
