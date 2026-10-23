import { useState, type FormEvent } from 'react';
import { CalendarOff, CalendarX2, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/Drawer';
import { useToast } from '../../components/ui/Toast';
import { addBlockedDate, errorMessage, fetchAppointments, fetchBlockedDates, removeBlockedDate } from '../../lib/api';
import { formatDateKey, toDateKey } from '../../lib/time';
import type { BlockedDate } from '../../lib/types';
import { useLoader } from '../useLoader';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';

const REASONS = ['Public holiday', 'Studio maintenance', 'Team training', 'Private event'];

export default function BlockedDates() {
  const toast = useToast();
  const todayKey = toDateKey(new Date());
  const { data, loading, error, reload } = useLoader(async () => {
    const [blocked, appointments] = await Promise.all([fetchBlockedDates(), fetchAppointments()]);
    const booked = new Map<string, number>();
    for (const a of appointments) {
      if (a.status === 'cancelled' || a.appointment_date < todayKey) continue;
      booked.set(a.appointment_date, (booked.get(a.appointment_date) ?? 0) + 1);
    }
    return { blocked, booked };
  });

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<BlockedDate | null>(null);
  const [busy, setBusy] = useState(false);

  const blocked = data?.blocked ?? [];
  const upcoming = blocked.filter((b) => b.blocked_date >= todayKey);
  const past = blocked.filter((b) => b.blocked_date < todayKey).reverse();
  const conflicts = date ? data?.booked.get(date) ?? 0 : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) {
      setFormError('Choose a date to block.');
      return;
    }
    if (blocked.some((b) => b.blocked_date === date)) {
      setFormError('That date is already blocked.');
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      await addBlockedDate(date, reason.trim());
      toast(`${formatDateKey(date, 'EEEE, MMMM d')} is now closed for booking.`);
      setDate('');
      setReason('');
      await reload({ silent: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await removeBlockedDate(removing.id);
      toast(`${formatDateKey(removing.blocked_date, 'MMMM d')} is open for booking again.`);
      setRemoving(null);
      await reload({ silent: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Schedule" title="Blocked Dates" description="Close the studio for holidays, training or maintenance. Blocked dates can’t be booked online." />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <div className="split-layout reverse">
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <h2>Block a date</h2>
              <p>Clients won’t see any times on this day.</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={submit} noValidate>
            <label className="field">
              <span className="field-label">Date</span>
              <input className="input" type="date" min={todayKey} value={date} onChange={(e) => { setDate(e.target.value); setFormError(null); }} />
            </label>
            <label className="field">
              <span className="field-label">Reason <span className="optional">Optional</span></span>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Public holiday" maxLength={120} />
            </label>
            <div className="chip-row">
              {REASONS.map((r) => (
                <button key={r} type="button" className={`chip ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>{r}</button>
              ))}
            </div>
            {conflicts > 0 && (
              <div className="alert alert-warn">
                <CalendarX2 />
                <span>{conflicts} active appointment{conflicts === 1 ? ' is' : 's are'} already booked on this date. Blocking it won’t cancel {conflicts === 1 ? 'it' : 'them'} — please contact those clients.</span>
              </div>
            )}
            {formError && <div className="alert alert-error">{formError}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={adding}>
              {adding ? <span className="spinner" /> : <><Plus /> Block date</>}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Upcoming closures</h2>
              <p>{upcoming.length ? `${upcoming.length} date${upcoming.length === 1 ? '' : 's'} blocked` : 'The studio is open on all scheduled days'}</p>
            </div>
          </div>
          {loading ? (
            <LoadingBlock rows={3} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={<CalendarOff />} title="No blocked dates" text="Add a date on the left to close the studio for the day." />
          ) : (
            <ul className="blocked-list">
              {upcoming.map((b) => (
                <BlockedItem key={b.id} item={b} booked={data?.booked.get(b.blocked_date) ?? 0} onRemove={() => setRemoving(b)} />
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <details className="past-details">
              <summary>Past closures ({past.length})</summary>
              <ul className="blocked-list">
                {past.map((b) => (
                  <BlockedItem key={b.id} item={b} booked={0} onRemove={() => setRemoving(b)} past />
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Reopen this date?"
        message={removing ? `${formatDateKey(removing.blocked_date, 'EEEE, MMMM d, yyyy')} will become available for online booking again.` : ''}
        confirmLabel="Remove block"
        busy={busy}
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

function BlockedItem({ item, booked, onRemove, past }: { item: BlockedDate; booked: number; onRemove: () => void; past?: boolean }) {
  return (
    <li className={`blocked-item ${past ? 'is-past' : ''}`}>
      <span className="date-tile terra">
        <span>{formatDateKey(item.blocked_date, 'MMM')}</span>
        <strong>{formatDateKey(item.blocked_date, 'd')}</strong>
      </span>
      <div className="blocked-main">
        <strong>{formatDateKey(item.blocked_date, 'EEEE, MMMM d, yyyy')}</strong>
        <span>{item.reason || 'Studio closed'}</span>
        {booked > 0 && <em>{booked} appointment{booked === 1 ? '' : 's'} still booked</em>}
      </div>
      <button type="button" className="icon-btn danger" onClick={onRemove} aria-label="Remove blocked date">
        <Trash2 />
      </button>
    </li>
  );
}
