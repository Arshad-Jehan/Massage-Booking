import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Clock4, MapPin, Phone, Save, Timer } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { LogoMark } from '../../components/public/Logo';
import { errorMessage, fetchSettings, saveSettings } from '../../lib/api';
import { useLoader } from '../useLoader';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';

const INTERVALS = [10, 15, 20, 30, 45, 60];
const NOTICE = [0, 1, 2, 4, 12, 24, 48];

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useLoader(fetchSettings);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [interval, setSlotInterval] = useState('30');
  const [notice, setNotice] = useState('2');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setName(data?.business_name ?? '');
    setPhone(data?.business_phone ?? '');
    setAddress(data?.business_address ?? '');
    setSlotInterval(String(data?.slot_interval_minutes ?? 30));
    setNotice(String(data?.booking_notice_hours ?? 2));
  }, [data, loading]);

  const intervalNum = Number(interval);
  const noticeNum = Number(notice);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setFormError('Please enter the business name.');
    if (!Number.isInteger(intervalNum) || intervalNum < 5 || intervalNum > 240) return setFormError('Slot interval must be between 5 and 240 minutes.');
    if (!Number.isInteger(noticeNum) || noticeNum < 0 || noticeNum > 720) return setFormError('Booking notice must be between 0 and 720 hours.');
    setSaving(true);
    setFormError(null);
    try {
      const saved = await saveSettings(
        {
          business_name: name.trim(),
          business_phone: phone.trim() || null,
          business_address: address.trim() || null,
          slot_interval_minutes: intervalNum,
          booking_notice_hours: noticeNum,
        },
        data?.id,
      );
      setData(saved);
      window.dispatchEvent(new CustomEvent('studio:renamed', { detail: saved.business_name }));
      toast('Massage settings saved. The website is updated.');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Studio" title="Massage Settings" description="Your business details and the rules that shape online booking." />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      {loading ? (
        <section className="panel"><LoadingBlock rows={5} /></section>
      ) : (
        <form className="settings-layout" onSubmit={submit} noValidate>
          <div className="settings-main">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Business details</h2>
                  <p>Shown in the website header, footer and booking confirmation.</p>
                </div>
              </div>
              <div className="form-stack">
                <label className="field">
                  <span className="field-label">Business name</span>
                  <span className="input-with-icon"><Building2 /><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stillwater Massage Therapy" /></span>
                </label>
                <label className="field">
                  <span className="field-label">Phone <span className="optional">Optional</span></span>
                  <span className="input-with-icon"><Phone /><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(555) 123-4567" /></span>
                </label>
                <label className="field">
                  <span className="field-label">Address <span className="optional">Optional</span></span>
                  <span className="input-with-icon"><MapPin /><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postcode" /></span>
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Booking rules</h2>
                  <p>Controls which start times clients can choose online.</p>
                </div>
              </div>
              <div className="form-stack">
                <div className="field">
                  <span className="field-label"><span><Timer className="inline-icon" /> Time slot interval</span></span>
                  <div className="chip-row">
                    {INTERVALS.map((i) => (
                      <button key={i} type="button" className={`chip ${intervalNum === i ? 'active' : ''}`} onClick={() => setSlotInterval(String(i))}>{i} min</button>
                    ))}
                  </div>
                  <span className="input-suffix">
                    <input className="input" type="number" min={5} max={240} value={interval} onChange={(e) => setSlotInterval(e.target.value)} />
                    <span>minutes</span>
                  </span>
                  <span className="field-hint">Start times are offered every {intervalNum || '—'} minutes from opening time.</span>
                </div>
                <div className="field">
                  <span className="field-label"><span><Clock4 className="inline-icon" /> Minimum booking notice</span></span>
                  <div className="chip-row">
                    {NOTICE.map((n) => (
                      <button key={n} type="button" className={`chip ${noticeNum === n ? 'active' : ''}`} onClick={() => setNotice(String(n))}>{n === 0 ? 'None' : `${n} hr`}</button>
                    ))}
                  </div>
                  <span className="input-suffix">
                    <input className="input" type="number" min={0} max={720} value={notice} onChange={(e) => setNotice(e.target.value)} />
                    <span>hours</span>
                  </span>
                  <span className="field-hint">Clients can’t book a session starting sooner than this.</span>
                </div>
              </div>
            </section>

            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : <><Save /> Save settings</>}
              </button>
            </div>
          </div>

          <aside className="settings-preview">
            <span className="preview-label">Website preview</span>
            <div className="preview-card">
              <div className="preview-brand">
                <LogoMark size={34} />
                <strong>{name.trim() || 'Your studio name'}</strong>
              </div>
              <ul>
                <li><Phone /> {phone.trim() || <span className="muted">No phone added</span>}</li>
                <li><MapPin /> {address.trim() || <span className="muted">No address added</span>}</li>
              </ul>
              <div className="preview-rules">
                <div><strong>{intervalNum || '—'}</strong><span>min between start times</span></div>
                <div><strong>{noticeNum || 0}</strong><span>hr minimum notice</span></div>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
