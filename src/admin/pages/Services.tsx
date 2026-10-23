import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Clock, Pencil, Plus, Sparkles, UserPlus, UsersRound } from 'lucide-react';
import { imageForService } from '../../config/images';
import { errorMessage, fetchMasseuses, fetchServices, setServiceActive } from '../../lib/api';
import { formatDuration, formatPrice } from '../../lib/time';
import type { Masseuse, Service } from '../../lib/types';
import { SmartImage } from '../../components/ui/SmartImage';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import { useLoader } from '../useLoader';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/PageHeader';
import { ServiceDrawer } from '../components/ServiceDrawer';
import { MasseuseDrawer } from '../components/MasseuseDrawer';
import { Avatar } from './Masseuses';

export default function Services() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useLoader(async () => {
    const [services, masseuses] = await Promise.all([fetchServices({ activeOnly: false }), fetchMasseuses({ activeOnly: false })]);
    return { services, masseuses };
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMasseuse, setEditingMasseuse] = useState<Masseuse | null>(null);
  const [masseuseOpen, setMasseuseOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const services = data?.services ?? [];
  const masseuses = data?.masseuses ?? [];
  const activeCount = services.filter((s) => s.is_active).length;

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setDrawerOpen(true); };

  const toggle = async (s: Service, value: boolean) => {
    setBusyId(s.id);
    try {
      await setServiceActive(s.id, value);
      setData((d) => d && { ...d, services: d.services.map((x) => (x.id === s.id ? { ...x, is_active: value } : x)) });
      toast(value ? `“${s.name}” is now bookable online.` : `“${s.name}” hidden from the booking page.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Menu"
        title="Services"
        description="Add, edit and switch treatments on or off. Changes appear on the website instantly."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus /> New service
          </button>
        }
      />

      {error && <ErrorBlock message={error} onRetry={() => void reload()} />}

      <div className="mini-stats">
        <div><strong>{services.length}</strong><span>Total services</span></div>
        <div><strong>{activeCount}</strong><span>Bookable online</span></div>
        <div><strong>{services.length - activeCount}</strong><span>Inactive</span></div>
      </div>

      <section className="panel">
        {loading ? (
          <LoadingBlock rows={4} />
        ) : services.length === 0 ? (
          <EmptyState
            icon={<Sparkles />}
            title="Create your first service"
            text="Services you add here appear on the website and in the booking flow."
            action={<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><Plus /> New service</button>}
          />
        ) : (
          <ul className="service-rows">
            {services.map((s, i) => (
              <li key={s.id} className={`service-row ${s.is_active ? '' : 'is-inactive'}`}>
                <SmartImage image={imageForService(s.name, i)} className="service-row-img" />
                <div className="service-row-main">
                  <div className="service-row-title">
                    <h3>{s.name}</h3>
                    <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      <span className="dot" /> {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p>{s.description || <span className="muted">No description yet</span>}</p>
                </div>
                <div className="service-row-meta">
                  <span><Clock /> {formatDuration(s.duration_minutes)}</span>
                  <strong>{formatPrice(s.price)}</strong>
                </div>
                <div className="service-row-actions">
                  <Switch checked={s.is_active} disabled={busyId === s.id} onChange={(v) => void toggle(s, v)} ariaLabel={`${s.name} active`} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                    <Pencil /> Edit
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
            <h2>Masseuses</h2>
            <p>The team clients can choose from when booking any service.</p>
          </div>
          <div className="panel-head-actions">
            <Link to="/admin/masseuses" className="btn btn-ghost btn-sm"><CalendarRange /> Manage availability</Link>
            <button type="button" className="btn btn-sage btn-sm" onClick={() => { setEditingMasseuse(null); setMasseuseOpen(true); }}>
              <UserPlus /> Add masseuse
            </button>
          </div>
        </div>
        {loading ? (
          <LoadingBlock rows={2} />
        ) : masseuses.length === 0 ? (
          <EmptyState icon={<UsersRound />} title="No masseuses yet" text="Without a team, the studio takes one booking at a time within business hours." />
        ) : (
          <div className="team-chips">
            {masseuses.map((m) => (
              <button key={m.id} type="button" className={`team-chip ${m.is_active ? '' : 'is-inactive'}`} onClick={() => { setEditingMasseuse(m); setMasseuseOpen(true); }}>
                <Avatar masseuse={m} size={36} />
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.is_active ? m.title || 'Massage therapist' : 'Inactive'}</small>
                </span>
                <Pencil className="team-chip-edit" />
              </button>
            ))}
          </div>
        )}
      </section>

      <ServiceDrawer
        open={drawerOpen}
        service={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={(msg) => { setDrawerOpen(false); toast(msg); void reload({ silent: true }); }}
      />
      <MasseuseDrawer
        open={masseuseOpen}
        masseuse={editingMasseuse}
        onClose={() => setMasseuseOpen(false)}
        onSaved={(msg) => { setMasseuseOpen(false); toast(msg); void reload({ silent: true }); }}
      />
    </div>
  );
}
