import { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarPlus, CalendarRange, Pencil, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { SmartImage } from '../../components/ui/SmartImage';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import {
  errorMessage,
  fetchBusinessHours,
  fetchMasseuseAvailability,
  fetchMasseuses,
  removeMasseuseAvailability,
  setMasseuseActive,
} from '../../lib/api';
import { formatDateKey, formatTimeValue, toDateKey } from '../../lib/time';
import type { Masseuse } from '../../lib/types';
import { useLoader } from '../useLoader';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';
import { MasseuseDrawer } from '../components/MasseuseDrawer';
import { AvailabilityDrawer } from '../components/AvailabilityDrawer';

export function Avatar({ masseuse, size = 48 }: { masseuse: Masseuse; size?: number }) {
  const initials = masseuse.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {masseuse.photo_url ? <SmartImage image={{ src: masseuse.photo_url, alt: masseuse.name }} /> : initials}
    </span>
  );
}

const HORIZON_DAYS = 90;

export default function Masseuses() {
  const toast = useToast();
  const fromKey = toDateKey(new Date());
  const toKey = toDateKey(addDays(new Date(), HORIZON_DAYS));

  const { data, loading, error, reload, setData } = useLoader(async () => {
    const [masseuses, availability, hours] = await Promise.all([
      fetchMasseuses({ activeOnly: false }),
      fetchMasseuseAvailability(fromKey, toKey),
      fetchBusinessHours(),
    ]);
    return { masseuses, availability, hours };
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Masseuse | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const masseuses = data?.masseuses ?? [];
  useEffect(() => {
    if (!selectedId && masseuses.length) setSelectedId(masseuses[0].id);
  }, [masseuses, selectedId]);

  const selected = masseuses.find((m) => m.id === selectedId) ?? null;
  const windows = useMemo(() => (data?.availability ?? []).filter((a) => a.masseuse_id === selectedId), [data, selectedId]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof windows>();
    for (const w of windows) map.set(w.available_date, [...(map.get(w.available_date) ?? []), w]);
    return Array.from(map.entries());
  }, [windows]);

  const daysFor = (id: string) => new Set((data?.availability ?? []).filter((a) => a.masseuse_id === id).map((a) => a.available_date)).size;

  const toggleActive = async (m: Masseuse, value: boolean) => {
    setBusyId(m.id);
    try {
      await setMasseuseActive(m.id, value);
      setData((d) => d && { ...d, masseuses: d.masseuses.map((x) => (x.id === m.id ? { ...x, is_active: value } : x)) });
      toast(value ? `${m.name} is accepting bookings.` : `${m.name} is hidden from booking.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const removeWindow = async (id: string) => {
    setBusyId(id);
    try {
      await removeMasseuseAvailability(id);
      setData((d) => d && { ...d, availability: d.availability.filter((a) => a.id !== id) });
      toast('Availability removed.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Team"
        title="Masseuses"
        description="Manage your therapists and the dates and times they can be booked."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setEditOpen(true); }}>
            <UserPlus /> Add masseuse
          </button>
        }
      />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      {!loading && masseuses.length > 0 && masseuses.some((m) => m.is_active && daysFor(m.id) === 0) && (
        <div className="alert alert-warn">
          <CalendarRange />
          <span>Some active masseuses have no upcoming availability, so they can’t be booked yet. Select them and add working days.</span>
        </div>
      )}

      {loading ? (
        <section className="panel"><LoadingBlock rows={4} /></section>
      ) : masseuses.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={<UsersRound />}
            title="Build your team"
            text="Add masseuses so clients can choose who they book with. Until then, the studio takes one booking at a time within business hours."
            action={<button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setEditOpen(true); }}><UserPlus /> Add masseuse</button>}
          />
        </section>
      ) : (
        <div className="split-layout">
          <section className="panel team-list">
            {masseuses.map((m) => {
              const days = daysFor(m.id);
              return (
                <div key={m.id} className={`team-row ${m.id === selectedId ? 'active' : ''} ${m.is_active ? '' : 'is-inactive'}`}>
                  <button type="button" className="team-row-main" onClick={() => setSelectedId(m.id)}>
                    <Avatar masseuse={m} />
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.title || 'Massage therapist'}</small>
                      <em className={days ? '' : 'none'}>{days ? `${days} working days scheduled` : 'No availability yet'}</em>
                    </span>
                  </button>
                  <div className="team-row-actions">
                    <Switch checked={m.is_active} disabled={busyId === m.id} onChange={(v) => void toggleActive(m, v)} ariaLabel={`${m.name} active`} />
                    <button type="button" className="icon-btn" onClick={() => { setEditing(m); setEditOpen(true); }} aria-label={`Edit ${m.name}`}>
                      <Pencil />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel">
            {selected && (
              <>
                <div className="panel-head">
                  <div className="panel-head-person">
                    <Avatar masseuse={selected} size={52} />
                    <div>
                      <h2>{selected.name}</h2>
                      <p>{[selected.title, selected.specialties].filter(Boolean).join(' · ') || 'Massage therapist'}</p>
                    </div>
                  </div>
                  <button type="button" className="btn btn-sage btn-sm" onClick={() => setAvailOpen(true)}>
                    <CalendarPlus /> Add availability
                  </button>
                </div>
                {selected.bio && <p className="bio">{selected.bio}</p>}

                <h3 className="subhead">Upcoming availability <span>next {HORIZON_DAYS} days</span></h3>
                {grouped.length === 0 ? (
                  <EmptyState
                    icon={<CalendarRange />}
                    title="No working days scheduled"
                    text={`Add dates and times so clients can book with ${selected.name}.`}
                    action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setAvailOpen(true)}><CalendarPlus /> Add availability</button>}
                  />
                ) : (
                  <ul className="avail-list">
                    {grouped.map(([day, list]) => (
                      <li key={day}>
                        <span className="avail-date">
                          <strong>{formatDateKey(day, 'd')}</strong>
                          <span>{formatDateKey(day, 'MMM')}</span>
                        </span>
                        <span className="avail-day">{formatDateKey(day, 'EEEE')}</span>
                        <span className="avail-windows">
                          {list.map((w) => (
                            <span key={w.id} className="avail-chip">
                              {formatTimeValue(w.start_time)} – {formatTimeValue(w.end_time)}
                              <button type="button" onClick={() => void removeWindow(w.id)} disabled={busyId === w.id} aria-label="Remove availability">
                                <Trash2 />
                              </button>
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <MasseuseDrawer
        open={editOpen}
        masseuse={editing}
        onClose={() => setEditOpen(false)}
        onSaved={(msg) => { setEditOpen(false); toast(msg); void reload({ silent: true }); }}
      />
      <AvailabilityDrawer
        open={availOpen}
        masseuse={selected}
        hours={data?.hours ?? []}
        existing={windows}
        onClose={() => setAvailOpen(false)}
        onSaved={(msg) => { setAvailOpen(false); toast(msg); void reload({ silent: true }); }}
      />
    </div>
  );
}
