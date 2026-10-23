import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { Drawer } from '../../components/ui/Drawer';
import { Switch } from '../../components/ui/Switch';
import { addMasseuseAvailability, errorMessage } from '../../lib/api';
import { formatDateKey, formatTimeValue, fromInputTime, minutesOf, parseDateKey, toDateKey, WEEKDAYS } from '../../lib/time';
import type { BusinessHours, Masseuse, MasseuseAvailability } from '../../lib/types';

interface Props {
  open: boolean;
  masseuse: Masseuse | null;
  hours: BusinessHours[];
  existing: MasseuseAvailability[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

type Mode = 'single' | 'range';
const MAX_DAYS = 120;

export function AvailabilityDrawer({ open, masseuse, hours, existing, onClose, onSaved }: Props) {
  const todayKey = toDateKey(new Date());
  const [mode, setMode] = useState<Mode>('range');
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(toDateKey(addDays(new Date(), 27)));
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [matchStudio, setMatchStudio] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode('range');
    setStartDate(todayKey);
    setEndDate(toDateKey(addDays(new Date(), 27)));
    setWeekdays(hours.filter((h) => h.is_open).map((h) => h.weekday));
    setMatchStudio(true);
    setStartTime('09:00');
    setEndTime('17:00');
    setError(null);
  }, [open, hours, todayKey]);

  const plan = useMemo(() => {
    const start = parseDateKey(startDate);
    const end = mode === 'single' ? start : parseDateKey(endDate);
    if (!start || !end) return { rows: [], skipped: 0, problem: 'Choose valid dates.' };
    const span = differenceInCalendarDays(end, start);
    if (span < 0) return { rows: [], skipped: 0, problem: 'The end date must be after the start date.' };
    if (span > MAX_DAYS) return { rows: [], skipped: 0, problem: `Please choose a range of ${MAX_DAYS} days or fewer.` };
    if (!matchStudio && minutesOf(endTime) <= minutesOf(startTime)) return { rows: [], skipped: 0, problem: 'End time must be after start time.' };

    const rows: Array<{ masseuse_id: string; available_date: string; start_time: string; end_time: string }> = [];
    let skipped = 0;
    for (let i = 0; i <= span; i++) {
      const day = addDays(start, i);
      if (mode === 'range' && !weekdays.includes(day.getDay())) continue;
      let s = fromInputTime(startTime);
      let e = fromInputTime(endTime);
      if (matchStudio) {
        const h = hours.find((x) => x.weekday === day.getDay());
        if (!h || !h.is_open) { skipped++; continue; }
        s = h.start_time;
        e = h.end_time;
      }
      const key = toDateKey(day);
      const clash = existing.some((a) => a.available_date === key && minutesOf(s) < minutesOf(a.end_time) && minutesOf(e) > minutesOf(a.start_time));
      if (clash) { skipped++; continue; }
      rows.push({ masseuse_id: masseuse?.id ?? '', available_date: key, start_time: s, end_time: e });
    }
    return { rows, skipped, problem: rows.length === 0 ? 'No new working days match these settings.' : null };
  }, [mode, startDate, endDate, weekdays, matchStudio, startTime, endTime, hours, existing, masseuse]);

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!masseuse || plan.problem) return;
    setSaving(true);
    setError(null);
    try {
      await addMasseuseAvailability(plan.rows);
      onSaved(`Added ${plan.rows.length} working ${plan.rows.length === 1 ? 'day' : 'days'} for ${masseuse.name}.`);
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
      title="Add availability"
      subtitle={masseuse ? `When can ${masseuse.name} take bookings?` : undefined}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="availability-form" className="btn btn-primary btn-sm" disabled={saving || Boolean(plan.problem)}>
            {saving ? <span className="spinner" /> : `Add ${plan.rows.length || ''} ${plan.rows.length === 1 ? 'day' : 'days'}`}
          </button>
        </>
      }
    >
      <form id="availability-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="segmented segmented-block">
          <button type="button" className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>Single date</button>
          <button type="button" className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Repeat weekly</button>
        </div>

        <div className={mode === 'range' ? 'form-row' : ''}>
          <label className="field">
            <span className="field-label">{mode === 'range' ? 'From' : 'Date'}</span>
            <input className="input" type="date" min={todayKey} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          {mode === 'range' && (
            <label className="field">
              <span className="field-label">Until</span>
              <input className="input" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          )}
        </div>

        {mode === 'range' && (
          <div className="field">
            <span className="field-label">Working days</span>
            <div className="weekday-picker">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" className={weekdays.includes(d) ? 'active' : ''} onClick={() => toggleDay(d)} aria-pressed={weekdays.includes(d)}>
                  {WEEKDAYS[d].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="toggle-card">
          <div>
            <strong>Match studio opening hours</strong>
            <span>Uses each day’s business hours and skips days the studio is closed.</span>
          </div>
          <Switch checked={matchStudio} onChange={setMatchStudio} ariaLabel="Match studio hours" />
        </div>

        {!matchStudio && (
          <div className="form-row">
            <label className="field">
              <span className="field-label">Starts</span>
              <input className="input" type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Ends</span>
              <input className="input" type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
        )}

        <div className={`plan-preview ${plan.problem ? 'warn' : ''}`}>
          {plan.problem ? (
            <span>{plan.problem}</span>
          ) : (
            <>
              <strong>{plan.rows.length} working {plan.rows.length === 1 ? 'day' : 'days'} will be added</strong>
              <span>
                {plan.rows.slice(0, 3).map((r) => `${formatDateKey(r.available_date, 'EEE MMM d')} ${formatTimeValue(r.start_time)}–${formatTimeValue(r.end_time)}`).join(' · ')}
                {plan.rows.length > 3 ? ' …' : ''}
              </span>
            </>
          )}
          {plan.skipped > 0 && <span className="plan-skip">{plan.skipped} day{plan.skipped === 1 ? '' : 's'} skipped (studio closed or already scheduled)</span>}
        </div>
      </form>
    </Drawer>
  );
}
