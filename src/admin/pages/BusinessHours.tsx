import { useEffect, useMemo, useState } from 'react';
import { Copy, RotateCcw, Save } from 'lucide-react';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import { errorMessage, fetchBusinessHours, saveBusinessHours } from '../../lib/api';
import { formatDuration, fromInputTime, minutesOf, toInputTime, WEEKDAYS } from '../../lib/time';
import { useLoader } from '../useLoader';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';

interface Row {
  weekday: number;
  is_open: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function BusinessHours() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoader(fetchBusinessHours);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const original = useMemo<Row[]>(
    () =>
      ORDER.map((d) => {
        const h = data?.find((x) => x.weekday === d);
        return { weekday: d, is_open: h?.is_open ?? false, start: toInputTime(h?.start_time) || '09:00', end: toInputTime(h?.end_time) || '17:00' };
      }),
    [data],
  );

  useEffect(() => {
    if (data) setRows(original);
  }, [data, original]);

  const dirty = JSON.stringify(rows) !== JSON.stringify(original);
  const invalid = rows.filter((r) => r.is_open && minutesOf(r.end) <= minutesOf(r.start)).map((r) => r.weekday);

  const update = (weekday: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  const copyToWeekdays = (source: Row) =>
    setRows((rs) => rs.map((r) => (r.weekday >= 1 && r.weekday <= 5 ? { ...r, is_open: source.is_open, start: source.start, end: source.end } : r)));

  const save = async () => {
    if (invalid.length) {
      toast('Closing time must be after opening time.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveBusinessHours(rows.map((r) => ({ weekday: r.weekday, is_open: r.is_open, start_time: fromInputTime(r.start), end_time: fromInputTime(r.end) })));
      toast('Opening hours saved. Booking times are updated.');
      await reload({ silent: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDays = rows.filter((r) => r.is_open).length;
  const weeklyMinutes = rows.filter((r) => r.is_open).reduce((sum, r) => sum + Math.max(0, minutesOf(r.end) - minutesOf(r.start)), 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Schedule"
        title="Business Hours"
        description="Set when the studio is open. Online booking times are generated from these hours."
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(original)} disabled={!dirty || saving}>
              <RotateCcw /> Reset
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? <span className="spinner" /> : <><Save /> Save hours</>}
            </button>
          </>
        }
      />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <div className="mini-stats">
        <div><strong>{openDays}</strong><span>Open days per week</span></div>
        <div><strong>{Math.round(weeklyMinutes / 60)}</strong><span>Open hours per week</span></div>
      </div>

      <section className="panel">
        {loading ? (
          <LoadingBlock rows={7} />
        ) : (
          <ul className="hours-list">
            {rows.map((r) => {
              const bad = invalid.includes(r.weekday);
              const isToday = new Date().getDay() === r.weekday;
              return (
                <li key={r.weekday} className={`hours-row ${r.is_open ? '' : 'is-closed'} ${bad ? 'has-error' : ''}`}>
                  <div className="hours-day">
                    <strong>{WEEKDAYS[r.weekday]}</strong>
                    {isToday && <span className="today-pill">Today</span>}
                  </div>
                  <Switch checked={r.is_open} onChange={(v) => update(r.weekday, { is_open: v })} label={r.is_open ? 'Open' : 'Closed'} ariaLabel={`${WEEKDAYS[r.weekday]} open`} />
                  <div className="hours-times">
                    <input className="input input-sm" type="time" step={900} value={r.start} disabled={!r.is_open} onChange={(e) => update(r.weekday, { start: e.target.value })} aria-label={`${WEEKDAYS[r.weekday]} opening time`} />
                    <span className="hours-sep">to</span>
                    <input className="input input-sm" type="time" step={900} value={r.end} disabled={!r.is_open} onChange={(e) => update(r.weekday, { end: e.target.value })} aria-label={`${WEEKDAYS[r.weekday]} closing time`} />
                  </div>
                  <span className="hours-total">
                    {!r.is_open ? '—' : bad ? 'Check times' : formatDuration(minutesOf(r.end) - minutesOf(r.start))}
                  </span>
                  {r.weekday === 1 ? (
                    <button type="button" className="btn btn-ghost btn-sm hours-copy" onClick={() => copyToWeekdays(r)} title="Apply Monday’s hours to Tuesday–Friday">
                      <Copy /> Copy to weekdays
                    </button>
                  ) : (
                    <span className="hours-copy" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {dirty && (
        <div className="save-bar">
          <span>You have unsaved changes</span>
          <div>
            <button type="button" className="btn btn-glass btn-sm" onClick={() => setRows(original)} disabled={saving}>Discard</button>
            <button type="button" className="btn btn-light btn-sm" onClick={() => void save()} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save hours'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
