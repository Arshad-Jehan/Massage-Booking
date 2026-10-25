import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleAlert,
  Clock,
  Phone,
  Sparkles,
  User,
  UserRound,
  Users,
} from 'lucide-react';
import { imageForService, IMAGES } from '../../config/images';
import { createBooking, errorMessage } from '../../lib/api';
import { buildCalendar, generateSlots, type DayAvailability, type StaffedSlot } from '../../lib/availability';
import { formatDuration, formatPrice, parseDateKey, safeFormat, toDateKey, toTimeValue } from '../../lib/time';
import { formatDurationRange, groupTreatments, treatmentKey } from '../../lib/treatments';
import type { BookingResult, Masseuse, Service } from '../../lib/types';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from '../public/PublicDataContext';
import { DatePicker } from './DatePicker';
import { downloadIcs } from './ics';
import { StepIndicator } from './StepIndicator';
import { TimeSlots } from './TimeSlots';

type StepKey = 'service' | 'time' | 'masseuse' | 'details';

const STEP_LABELS: Record<StepKey, string> = {
  service: 'Service',
  time: 'Date & time',
  masseuse: 'Masseuse',
  details: 'Your details',
};

const ANY = 'any';

interface Props {
  /**
   * Set from the services section (a treatment) or the pricing page (an exact session).
   * `nonce` changes on every click.
   */
  request: { treatmentKey?: string; serviceId?: string; nonce: number } | null;
}

interface Confirmation {
  result: BookingResult;
  service: Service;
  start: Date;
  end: Date;
  name: string;
  phone: string;
  masseuseName: string | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function BookingFlow({ request }: Props) {
  const data = usePublicData();
  const { services, masseuses, loading, brandName, settings } = data;
  const error = data.error ?? data.bookingError;
  const steps: StepKey[] = ['service', 'time', 'masseuse', 'details'];

  const [stepIndex, setStepIndex] = useState(0);
  const [treatment, setTreatment] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<StaffedSlot | null>(null);
  const [masseuseId, setMasseuseId] = useState<string>(ANY);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const service = services.find((s) => s.id === serviceId) ?? null;
  const treatments = useMemo(() => groupTreatments(services), [services]);
  const activeTreatment = treatments.find((t) => t.key === treatment) ?? null;

  // Preselect from the services section (pick a length next) or the pricing page (go straight to times).
  useEffect(() => {
    if (!request) return;
    setDateKey(null);
    setSlot(null);
    setMasseuseId(ANY);
    setConfirmation(null);
    if (request.serviceId) {
      const s = services.find((x) => x.id === request.serviceId);
      setServiceId(request.serviceId);
      setTreatment(s ? treatmentKey(s.name) : null);
      setStepIndex(1);
    } else if (request.treatmentKey) {
      const t = treatments.find((x) => x.key === request.treatmentKey);
      setTreatment(request.treatmentKey);
      setServiceId(t && t.options.length === 1 ? t.options[0].id : null);
      setStepIndex(0);
    }
    // Only react to new requests, not to data refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // If the chosen service disappears (deactivated), reset.
  useEffect(() => {
    if (!loading && serviceId && !services.some((s) => s.id === serviceId)) {
      setServiceId(null);
      setStepIndex(0);
    }
  }, [loading, serviceId, services]);

  const calendar = useMemo<DayAvailability[]>(() => (service ? buildCalendar(service, data) : []), [service, data]);

  // Auto-select the first available day when entering the time step.
  useEffect(() => {
    if (step !== 'time' || !service) return;
    const current = calendar.find((d) => d.key === dateKey);
    if (!current || current.status !== 'available') {
      const firstOpen = calendar.find((d) => d.status === 'available');
      setDateKey(firstOpen?.key ?? null);
      setSlot(null);
    }
  }, [step, service, calendar, dateKey]);

  const selectedDate = dateKey ? parseDateKey(dateKey) : null;
  const slots = useMemo(() => (service && selectedDate ? generateSlots(selectedDate, service, data) : []), [service, selectedDate?.getTime(), data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selected slot in sync with fresh availability data.
  useEffect(() => {
    if (!slot) return;
    const fresh = slots.find((s) => s.start.getTime() === slot.start.getTime());
    if (!fresh) setSlot(null);
    else if (fresh.masseuseIds.join() !== slot.masseuseIds.join()) setSlot(fresh);
  }, [slots, slot]);

  // Every masseuse is listed; only those free for the chosen time can be picked.
  const isFree = (m: Masseuse) => Boolean(slot?.masseuseIds.includes(m.id));
  const orderedMasseuses = [...masseuses].sort((a, b) => Number(isFree(b)) - Number(isFree(a)));
  useEffect(() => {
    if (masseuseId !== ANY && slot && !slot.masseuseIds.includes(masseuseId)) setMasseuseId(ANY);
  }, [slot, masseuseId]);

  const selectedMasseuse = masseuseId === ANY ? null : masseuses.find((m) => m.id === masseuseId) ?? null;

  const phoneDigits = phone.replace(/\D/g, '');
  const nameError = touched && name.trim().length < 2 ? 'Please enter your full name.' : null;
  const phoneError = touched && phoneDigits.length < 7 ? 'Please enter a valid phone number.' : null;

  const canContinue =
    step === 'service' ? Boolean(service) :
    step === 'time' ? Boolean(slot) :
    step === 'masseuse' ? Boolean(slot) :
    true;

  const goTo = (i: number) => {
    setStepIndex(i);
    setSubmitError(null);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 110;
      if (Math.abs(window.scrollY - top) > 160) window.scrollTo({ top, behavior: 'smooth' });
    });
  };

  const next = () => canContinue && goTo(Math.min(stepIndex + 1, steps.length - 1));
  const back = () => goTo(Math.max(stepIndex - 1, 0));

  const chooseService = (id: string) => {
    if (id !== serviceId) {
      setSlot(null);
      setMasseuseId(ANY);
    }
    setServiceId(id);
  };

  const chooseTreatment = (key: string) => {
    if (key === treatment) return;
    const t = treatments.find((x) => x.key === key);
    setTreatment(key);
    setSlot(null);
    setMasseuseId(ANY);
    setServiceId(t && t.options.length === 1 ? t.options[0].id : null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!service || !slot || name.trim().length < 2 || phoneDigits.length < 7) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking({
        name: name.trim(),
        phone: phone.trim(),
        serviceId: service.id,
        appointmentDate: toDateKey(slot.start),
        startTime: toTimeValue(slot.start),
        notes: notes.trim(),
        masseuseId: masseuseId === ANY ? null : masseuseId,
      });
      setConfirmation({
        result,
        service,
        start: slot.start,
        end: slot.end,
        name: name.trim(),
        phone: phone.trim(),
        masseuseName: result.masseuse_name ?? selectedMasseuse?.name ?? null,
      });
      void data.refreshAvailability();
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      const msg = errorMessage(err, 'We couldn’t complete your booking. Please try again.');
      setSubmitError(msg);
      if (/just booked|opening hours|closed|no longer available/i.test(msg)) {
        void data.refreshAvailability();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setConfirmation(null);
    setServiceId(null);
    setTreatment(null);
    setDateKey(null);
    setSlot(null);
    setMasseuseId(ANY);
    setName('');
    setPhone('');
    setNotes('');
    setTouched(false);
    setStepIndex(0);
  };

  /* ------------------------------------------------------------------ */

  const summaryName = service?.name ?? activeTreatment?.name ?? null;
  const summaryImage = summaryName
    ? imageForService(summaryName, Math.max(0, treatments.findIndex((t) => t.key === treatmentKey(summaryName))))
    : IMAGES.bookingAside;

  return (
    <section className="section booking" id="booking">
      <div className="booking-bg" aria-hidden="true" />
      <div className="container">
        <div className="section-head center reveal">
          <span className="eyebrow">Book online</span>
          <h2 className="section-title">
            Book your session <em>in a few calm steps.</em>
          </h2>
          <p className="section-intro">
            Choose a treatment, pick a time that suits you and we’ll take care of the rest. Your request is sent
            straight to our team, who will confirm by phone.
          </p>
        </div>

        <div className="booking-shell reveal" ref={panelRef}>
          {confirmation ? (
            <SuccessPanel
              confirmation={confirmation}
              brandName={brandName}
              address={settings?.business_address ?? ''}
              phone={settings?.business_phone ?? ''}
              onReset={reset}
            />
          ) : (
            <>
              <div className="booking-main">
                <StepIndicator steps={steps.map((k) => ({ key: k, label: STEP_LABELS[k] }))} current={stepIndex} onJump={goTo} />

                {loading && (
                  <div className="booking-loading">
                    <span className="spinner spinner-lg" />
                    <p>Checking the studio calendar…</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="alert alert-error"><CircleAlert /> <span>{error}</span></div>
                )}

                {!loading && !error && (
                  <div className="booking-step" key={step}>
                    {step === 'service' && (
                      <>
                        <StepHeading title="Select a massage service" text="Choose a treatment, then the session length that suits you." />
                        {treatments.length === 0 ? (
                          <div className="empty-inline">No services are open for online booking right now. Please call the studio.</div>
                        ) : (
                          <>
                            <div className="service-options">
                              {treatments.map((t, i) => {
                                const sel = t.key === treatment;
                                return (
                                  <button key={t.key} type="button" className={`service-option ${sel ? 'is-selected' : ''}`} onClick={() => chooseTreatment(t.key)} aria-pressed={sel}>
                                    <SmartImage image={imageForService(t.name, i)} className="service-option-img" />
                                    <span className="service-option-body">
                                      <strong>{t.name}</strong>
                                      <span className="service-option-meta">
                                        <span><Clock /> {formatDurationRange(t)}</span>
                                        <span className="price">From {formatPrice(t.fromPrice)}</span>
                                      </span>
                                    </span>
                                    <span className="check-ring">{sel && <Check />}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {activeTreatment && (
                              <div className="length-picker" key={activeTreatment.key}>
                                <span className="length-label">Session length</span>
                                <div className="length-grid">
                                  {activeTreatment.options.map((o) => {
                                    const sel = o.id === serviceId;
                                    return (
                                      <button key={o.id} type="button" className={`length-option ${sel ? 'is-selected' : ''}`} onClick={() => chooseService(o.id)} aria-pressed={sel}>
                                        <strong>{o.duration_minutes} min</strong>
                                        <span>{formatPrice(o.price)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {step === 'time' && service && (
                      <>
                        <StepHeading title="Select a date and time" text={`Showing open times for ${service.name} (${formatDuration(service.duration_minutes)}).`} />
                        <div className="time-layout">
                          <DatePicker
                            days={calendar}
                            selectedKey={dateKey}
                            onSelect={(d) => {
                              setDateKey(d.key);
                              setSlot(null);
                            }}
                          />
                          <div className="time-panel">
                            <div className="time-panel-head">
                              <CalendarDays />
                              <div>
                                <strong>{selectedDate ? safeFormat(selectedDate, 'EEEE, MMMM d') : 'Choose a day'}</strong>
                                <span>{slots.length ? `${slots.length} ${slots.length === 1 ? 'time' : 'times'} available` : selectedDate ? 'No open times' : 'Open days are marked with a dot'}</span>
                              </div>
                            </div>
                            {selectedDate && slots.length > 0 && <TimeSlots slots={slots} selected={slot} onSelect={setSlot} />}
                            {!calendar.some((d) => d.status === 'available') && (
                              <div className="empty-inline">
                                There are no open times in the next few weeks. Please call us — we’re happy to help find a time.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {step === 'masseuse' && slot && (
                      <>
                        <StepHeading title="Select your masseuse" text={`Available ${safeFormat(slot.start, 'EEEE, MMM d')} at ${slot.label}.`} />
                        <div className="masseuse-options">
                          <button type="button" className={`masseuse-option any ${masseuseId === ANY ? 'is-selected' : ''}`} onClick={() => setMasseuseId(ANY)} aria-pressed={masseuseId === ANY}>
                            <span className="masseuse-avatar any"><Users /></span>
                            <span className="masseuse-body">
                              <strong>Any available masseuse</strong>
                              <span>We’ll match you with the best therapist for this time.</span>
                            </span>
                            <span className="masseuse-tag">Recommended</span>
                            <span className="check-ring">{masseuseId === ANY && <Check />}</span>
                          </button>
                          {orderedMasseuses.map((m) => {
                            const free = isFree(m);
                            const sel = masseuseId === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                className={`masseuse-option ${sel ? 'is-selected' : ''} ${free ? '' : 'is-unavailable'}`}
                                onClick={() => free && setMasseuseId(m.id)}
                                disabled={!free}
                                aria-pressed={sel}
                              >
                                <span className="masseuse-avatar">
                                  {m.photo_url ? <SmartImage image={{ src: m.photo_url, alt: `Portrait of ${m.name}` }} /> : initials(m.name)}
                                </span>
                                <span className="masseuse-body">
                                  <strong>{m.name}</strong>
                                  <span>
                                    {free
                                      ? [m.title, m.specialties].filter(Boolean).join(' · ') || 'Massage therapist'
                                      : `Not available at ${slot.label} — try another time`}
                                  </span>
                                </span>
                                {free ? <span className="check-ring">{sel && <Check />}</span> : <span className="masseuse-busy">Unavailable</span>}
                              </button>
                            );
                          })}
                        </div>
                        {masseuses.length === 0 && (
                          <p className="hint-line">Our team will match you with a therapist for this time.</p>
                        )}
                      </>
                    )}

                    {step === 'details' && (
                      <form id="booking-details" onSubmit={submit} noValidate>
                        <StepHeading title="Enter your details" text="We’ll use these to confirm your appointment. No account needed." />
                        <div className="details-grid">
                          <label className="field">
                            <span className="field-label">Full name</span>
                            <span className="input-with-icon">
                              <User />
                              <input className={`input ${nameError ? 'has-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" />
                            </span>
                            {nameError && <span className="field-error">{nameError}</span>}
                          </label>
                          <label className="field">
                            <span className="field-label">Phone number</span>
                            <span className="input-with-icon">
                              <Phone />
                              <input className={`input ${phoneError ? 'has-error' : ''}`} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="(555) 123-4567" />
                            </span>
                            {phoneError && <span className="field-error">{phoneError}</span>}
                          </label>
                          <label className="field details-notes">
                            <span className="field-label">
                              Notes for your therapist <span className="optional">Optional</span>
                            </span>
                            <textarea
                              className="textarea"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              maxLength={600}
                              placeholder="Areas of tension, preferred pressure, anything we should know…"
                            />
                          </label>
                        </div>
                        {submitError && (
                          <div className="alert alert-error" style={{ marginTop: 18 }}>
                            <CircleAlert />
                            <span>
                              {submitError}{' '}
                              {/just booked/i.test(submitError) && (
                                <button type="button" className="link-btn" onClick={() => goTo(1)}>
                                  Choose another time
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {!loading && !error && (
                  <div className="booking-nav">
                    {stepIndex > 0 ? (
                      <button type="button" className="btn btn-ghost" onClick={back} disabled={submitting}>
                        <ArrowLeft /> Back
                      </button>
                    ) : (
                      <span />
                    )}
                    {step === 'details' ? (
                      <button type="submit" form="booking-details" className="btn btn-sage btn-lg" disabled={submitting}>
                        {submitting ? <><span className="spinner" /> Booking…</> : <>Request appointment <ArrowRight className="btn-arrow" /></>}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={!canContinue}>
                        Continue <ArrowRight className="btn-arrow" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <aside className="booking-summary">
                <SmartImage image={summaryImage} className="summary-img" />
                <div className="summary-body">
                  <span className="eyebrow">Your appointment</span>
                  <h3>{summaryName ?? 'Choose a treatment'}</h3>
                  <dl className="summary-list">
                    <SummaryRow icon={<CalendarDays />} label="Date" value={slot ? safeFormat(slot.start, 'EEE, MMM d, yyyy') : '—'} />
                    <SummaryRow icon={<Clock />} label="Time" value={slot ? `${safeFormat(slot.start, 'h:mm a')} – ${safeFormat(slot.end, 'h:mm a')}` : '—'} />
                    <SummaryRow icon={<UserRound />} label="Masseuse" value={slot ? (selectedMasseuse?.name ?? 'Any available') : '—'} />
                    <SummaryRow icon={<Sparkles />} label="Duration" value={service ? formatDuration(service.duration_minutes) : '—'} />
                  </dl>
                  <div className="summary-total">
                    <span>Total</span>
                    <strong>{service ? formatPrice(service.price) : activeTreatment ? `From ${formatPrice(activeTreatment.fromPrice)}` : '—'}</strong>
                  </div>
                  <p className="summary-note">Pay at the studio after your session. Need to change plans? Just give us a call.</p>
                </div>
              </aside>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StepHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="step-heading">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="summary-row">
      <dt>{icon} {label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SuccessPanel({
  confirmation,
  brandName,
  address,
  phone,
  onReset,
}: {
  confirmation: Confirmation;
  brandName: string;
  address: string;
  phone: string;
  onReset: () => void;
}) {
  const { service, start, end, name, masseuseName, result } = confirmation;
  const firstName = name.split(' ')[0];
  return (
    <div className="success">
      <div className="success-visual">
        <SmartImage image={IMAGES.ambience} className="success-img" />
        <div className="success-badge">
          <svg viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l7 7 15-16" />
          </svg>
        </div>
      </div>
      <div className="success-body">
        <span className="eyebrow">Request received</span>
        <h3>Thank you, {firstName}. We’ve saved your time.</h3>
        <p>
          Your appointment request has been sent to {brandName}. Our team will call you to confirm shortly — until then
          it will show as <strong>pending</strong>.
        </p>

        <div className="success-card">
          <div><span>Service</span><strong>{service.name}</strong></div>
          <div><span>Date</span><strong>{safeFormat(start, 'EEEE, MMMM d, yyyy')}</strong></div>
          <div><span>Time</span><strong>{safeFormat(start, 'h:mm a')} – {safeFormat(end, 'h:mm a')}</strong></div>
          {masseuseName && <div><span>Masseuse</span><strong>{masseuseName}</strong></div>}
          <div><span>Price</span><strong>{formatPrice(service.price)}</strong></div>
          <div><span>Reference</span><strong className="mono">{result.id.slice(0, 8).toUpperCase()}</strong></div>
        </div>

        <div className="success-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              downloadIcs({
                title: `${service.name} — ${brandName}`,
                start,
                end,
                location: address || undefined,
                description: `Massage therapy appointment${masseuseName ? ` with ${masseuseName}` : ''}.${phone ? ` Studio phone: ${phone}` : ''}`,
              })
            }
          >
            <CalendarPlus /> Add to calendar
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Book another session
          </button>
        </div>
        <p className="success-foot">Please arrive 5–10 minutes early so you can settle in before your session.</p>
      </div>
    </div>
  );
}
