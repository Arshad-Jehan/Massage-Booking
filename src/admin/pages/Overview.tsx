import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, CalendarClock, Check, CircleCheckBig, Hourglass, Sparkles, X } from 'lucide-react';
import { addDays, startOfDay } from 'date-fns';
import { fetchAppointments, fetchServices, errorMessage, updateAppointmentStatus } from '../../lib/api';
import { formatDateKey, formatPrice, formatTimeValue, safeFormat, toDateKey } from '../../lib/time';
import type { AppointmentStatus, AppointmentWithRelations } from '../../lib/types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { useLoader } from '../useLoader';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';
import { AppointmentDrawer } from '../components/AppointmentDrawer';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const sortAsc = (a: AppointmentWithRelations, b: AppointmentWithRelations) =>
  a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time);

export default function Overview() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useLoader(async () => {
    const [appointments, services] = await Promise.all([fetchAppointments(), fetchServices({ activeOnly: false })]);
    return { appointments, services };
  });
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const weekEnd = toDateKey(addDays(startOfDay(new Date()), 7));

  const stats = useMemo(() => {
    const appts = data?.appointments ?? [];
    const live = appts.filter((a) => a.status === 'pending' || a.status === 'confirmed');
    const upcoming = live.filter((a) => a.appointment_date >= today).sort(sortAsc);
    const pending = appts.filter((a) => a.status === 'pending' && a.appointment_date >= today).sort(sortAsc);
    const todays = live.filter((a) => a.appointment_date === today).sort(sortAsc);
    const completed = appts.filter((a) => a.status === 'completed');
    const monthPrefix = today.slice(0, 7);
    const monthRevenue = completed
      .filter((a) => a.appointment_date.startsWith(monthPrefix))
      .reduce((sum, a) => sum + Number(a.services?.price ?? 0), 0);
    const thisWeek = upcoming.filter((a) => a.appointment_date < weekEnd).length;
    const activeServices = (data?.services ?? []).filter((s) => s.is_active);
    return { upcoming, pending, todays, completed, monthRevenue, thisWeek, activeServices };
  }, [data, today, weekEnd]);

  const changeStatus = async (a: AppointmentWithRelations, status: AppointmentStatus) => {
    setBusyId(a.id);
    try {
      await updateAppointmentStatus(a.id, status);
      setData((d) => d && { ...d, appointments: d.appointments.map((x) => (x.id === a.id ? { ...x, status } : x)) });
      setSelected((s) => (s && s.id === a.id ? { ...s, status } : s));
      toast(`${a.name}’s appointment marked ${status}.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={safeFormat(new Date(), 'EEEE, MMMM d')}
        title={`${greeting()}.`}
        description="Here’s what’s happening at the studio today."
        actions={
          <Link to="/admin/appointments" className="btn btn-primary btn-sm">
            All appointments <ArrowRight className="btn-arrow" />
          </Link>
        }
      />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <div className="metric-grid">
        <Metric tone="sage" icon={<CalendarClock />} label="Upcoming appointments" value={loading ? null : stats.upcoming.length} hint={`${stats.thisWeek} in the next 7 days`} />
        <Metric tone="amber" icon={<Hourglass />} label="Pending requests" value={loading ? null : stats.pending.length} hint={stats.pending.length ? 'Awaiting your confirmation' : 'All caught up'} />
        <Metric tone="blue" icon={<CircleCheckBig />} label="Completed sessions" value={loading ? null : stats.completed.length} hint={`${formatPrice(stats.monthRevenue)} completed this month`} />
        <Metric tone="terra" icon={<Sparkles />} label="Active services" value={loading ? null : stats.activeServices.length} hint={`${(data?.services.length ?? 0) - stats.activeServices.length} inactive`} />
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Pending requests</h2>
              <p>New bookings waiting for confirmation</p>
            </div>
            {stats.pending.length > 0 && <span className="count-pill amber">{stats.pending.length}</span>}
          </div>
          {loading ? (
            <LoadingBlock rows={3} />
          ) : stats.pending.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 />} title="You’re all caught up" text="New booking requests will appear here for quick confirmation." />
          ) : (
            <ul className="appt-list">
              {stats.pending.slice(0, 6).map((a) => (
                <li key={a.id} className="appt-item">
                  <DateTile dateKey={a.appointment_date} />
                  <button type="button" className="appt-main" onClick={() => setSelected(a)}>
                    <strong>{a.name}</strong>
                    <span>{a.services?.name ?? 'Service'} · {formatTimeValue(a.start_time)}</span>
                  </button>
                  <div className="appt-actions">
                    <button type="button" className="icon-btn danger" title="Decline" aria-label={`Cancel ${a.name}`} disabled={busyId === a.id} onClick={() => void changeStatus(a, 'cancelled')}>
                      <X />
                    </button>
                    <button type="button" className="btn btn-sage btn-sm" aria-label={`Confirm ${a.name}`} disabled={busyId === a.id} onClick={() => void changeStatus(a, 'confirmed')}>
                      <Check /> <span className="btn-label">Confirm</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Today’s schedule</h2>
              <p>{safeFormat(new Date(), 'EEEE, MMMM d')}</p>
            </div>
            <span className="count-pill">{stats.todays.length}</span>
          </div>
          {loading ? (
            <LoadingBlock rows={3} />
          ) : stats.todays.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title="A quiet day" text="No sessions are scheduled for today yet." />
          ) : (
            <ol className="timeline">
              {stats.todays.map((a) => (
                <li key={a.id}>
                  <span className="timeline-time">{formatTimeValue(a.start_time)}</span>
                  <button type="button" className="timeline-card" onClick={() => setSelected(a)}>
                    <strong>{a.name}</strong>
                    <span>{a.services?.name} · until {formatTimeValue(a.end_time)}{a.appointment_masseuses?.masseuses ? ` · ${a.appointment_masseuses.masseuses.name}` : ''}</span>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel panel-wide">
          <div className="panel-head">
            <div>
              <h2>Upcoming appointments</h2>
              <p>The next sessions on the books</p>
            </div>
            <Link to="/admin/appointments" className="text-link">View all <ArrowRight /></Link>
          </div>
          {loading ? (
            <LoadingBlock rows={4} />
          ) : stats.upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title="No upcoming appointments" text="Once clients book online, their sessions will be listed here." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Client</th><th>Service</th><th>Date</th><th>Time</th><th>Masseuse</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {stats.upcoming.slice(0, 8).map((a) => (
                    <tr key={a.id} onClick={() => setSelected(a)} className="clickable">
                      <td data-label="Client"><div className="cell-primary">{a.name}</div><div className="cell-sub">{a.phone}</div></td>
                      <td data-label="Service">{a.services?.name ?? '—'}</td>
                      <td data-label="Date">{formatDateKey(a.appointment_date)}</td>
                      <td data-label="Time" className="nowrap">{formatTimeValue(a.start_time)}</td>
                      <td data-label="Masseuse">{a.appointment_masseuses?.masseuses?.name ?? <span className="muted">Any</span>}</td>
                      <td data-label="Status"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AppointmentDrawer appointment={selected} busy={Boolean(busyId)} onClose={() => setSelected(null)} onStatus={(a, s) => void changeStatus(a, s)} />
    </div>
  );
}

function Metric({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: number | null; hint: string; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span className="metric-label">{label}</span>
      {value === null ? <span className="skeleton" style={{ height: 40, width: 70, display: 'block', marginTop: 8 }} /> : <strong className="metric-value">{value}</strong>}
      <span className="metric-hint">{hint}</span>
    </div>
  );
}

export function DateTile({ dateKey }: { dateKey: string }) {
  return (
    <span className="date-tile">
      <span>{formatDateKey(dateKey, 'MMM')}</span>
      <strong>{formatDateKey(dateKey, 'd')}</strong>
    </span>
  );
}
