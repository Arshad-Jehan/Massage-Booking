import { useMemo, useState } from 'react';
import { CalendarSearch, RefreshCw, Search } from 'lucide-react';
import { errorMessage, fetchAppointments, updateAppointmentStatus } from '../../lib/api';
import { formatDateKey, formatTimeValue, toDateKey } from '../../lib/time';
import { APPOINTMENT_STATUSES, type AppointmentStatus, type AppointmentWithRelations } from '../../lib/types';
import { statusLabel } from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { useLoader } from '../useLoader';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';
import { AppointmentDrawer } from '../components/AppointmentDrawer';

type Scope = 'upcoming' | 'past' | 'all';

export default function Appointments() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useLoader(fetchAppointments);
  const [status, setStatus] = useState<AppointmentStatus | 'all'>('all');
  const [scope, setScope] = useState<Scope>('upcoming');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const all = data ?? [];

  const scoped = useMemo(() => {
    const list = all.filter((a) => (scope === 'upcoming' ? a.appointment_date >= today : scope === 'past' ? a.appointment_date < today : true));
    const q = query.trim().toLowerCase();
    const searched = q
      ? list.filter((a) =>
          [a.name, a.phone, a.services?.name, a.notes, a.appointment_masseuses?.masseuses?.name].some((v) => v?.toLowerCase().includes(q)),
        )
      : list;
    return searched.sort((a, b) => {
      const cmp = a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time);
      return scope === 'upcoming' ? cmp : -cmp;
    });
  }, [all, scope, query, today]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    for (const s of APPOINTMENT_STATUSES) c[s] = scoped.filter((a) => a.status === s).length;
    return c;
  }, [scoped]);

  const rows = status === 'all' ? scoped : scoped.filter((a) => a.status === status);

  const changeStatus = async (a: AppointmentWithRelations, next: AppointmentStatus) => {
    if (a.status === next) return;
    setBusyId(a.id);
    try {
      await updateAppointmentStatus(a.id, next);
      setData((list) => list && list.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
      setSelected((s) => (s && s.id === a.id ? { ...s, status: next } : s));
      toast(`Marked ${a.name}’s appointment as ${statusLabel(next).toLowerCase()}.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Bookings"
        title="Appointments"
        description="Review requests, confirm sessions and keep every client’s status up to date."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload({ silent: true })}>
            <RefreshCw /> Refresh
          </button>
        }
      />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <section className="panel">
        <div className="toolbar">
          <div className="segmented" role="tablist" aria-label="Filter by status">
            {(['all', ...APPOINTMENT_STATUSES] as const).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All' : statusLabel(s)}
                <span className="seg-count">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <select className="select select-sm" value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label="Date range">
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All dates</option>
            </select>
            <label className="input-with-icon search">
              <Search />
              <input className="input input-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, phone, service…" />
            </label>
          </div>
        </div>

        {loading ? (
          <LoadingBlock rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CalendarSearch />}
            title="No appointments found"
            text={query || status !== 'all' ? 'Try a different filter or search term.' : scope === 'upcoming' ? 'New online bookings will appear here.' : 'Nothing to show for this range.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Masseuse</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={`clickable ${a.status === 'cancelled' ? 'is-muted' : ''}`} onClick={() => setSelected(a)}>
                    <td data-label="Client">
                      <div className="cell-primary">{a.name}</div>
                      <a className="cell-sub link" href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()}>{a.phone}</a>
                    </td>
                    <td data-label="Service">
                      <div>{a.services?.name ?? '—'}</div>
                      {a.services && <div className="cell-sub">{a.services.duration_minutes} min</div>}
                    </td>
                    <td data-label="Date" className="nowrap">{formatDateKey(a.appointment_date, 'EEE, MMM d, yyyy')}</td>
                    <td data-label="Time" className="nowrap">{formatTimeValue(a.start_time)} – {formatTimeValue(a.end_time)}</td>
                    <td data-label="Masseuse">{a.appointment_masseuses?.masseuses?.name ?? <span className="muted">Unassigned</span>}</td>
                    <td data-label="Notes" className="cell-notes" title={a.notes ?? ''}>{a.notes || <span className="muted">—</span>}</td>
                    <td data-label="Status" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`status-select s-${a.status}`}
                        value={a.status}
                        disabled={busyId === a.id}
                        onChange={(e) => void changeStatus(a, e.target.value as AppointmentStatus)}
                        aria-label={`Status for ${a.name}`}
                      >
                        {APPOINTMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppointmentDrawer appointment={selected} busy={Boolean(busyId)} onClose={() => setSelected(null)} onStatus={(a, s) => void changeStatus(a, s)} />
    </div>
  );
}
