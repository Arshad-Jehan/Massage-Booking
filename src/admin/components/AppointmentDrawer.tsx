import { CalendarDays, Clock, NotebookPen, Phone, Sparkles, UserRound } from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';
import { StatusBadge, statusLabel } from '../../components/ui/StatusBadge';
import { formatDateKey, formatDuration, formatPrice, formatTimeValue } from '../../lib/time';
import { APPOINTMENT_STATUSES, type AppointmentStatus, type AppointmentWithRelations } from '../../lib/types';

interface Props {
  appointment: AppointmentWithRelations | null;
  busy: boolean;
  onClose: () => void;
  onStatus: (a: AppointmentWithRelations, status: AppointmentStatus) => void;
}

export function AppointmentDrawer({ appointment: a, busy, onClose, onStatus }: Props) {
  return (
    <Drawer
      open={Boolean(a)}
      onClose={onClose}
      title={a?.name ?? ''}
      subtitle={a ? `Requested ${new Date(a.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : undefined}
    >
      {a && (
        <>
          <div className="detail-status">
            <StatusBadge status={a.status} />
          </div>
          <dl className="detail-list">
            <div><dt><Sparkles /> Service</dt><dd>{a.services?.name ?? 'Removed service'}{a.services && <span>{formatDuration(a.services.duration_minutes)} · {formatPrice(a.services.price)}</span>}</dd></div>
            <div><dt><CalendarDays /> Date</dt><dd>{formatDateKey(a.appointment_date, 'EEEE, MMMM d, yyyy')}</dd></div>
            <div><dt><Clock /> Time</dt><dd>{formatTimeValue(a.start_time)} – {formatTimeValue(a.end_time)}</dd></div>
            <div><dt><UserRound /> Masseuse</dt><dd>{a.appointment_masseuses?.masseuses?.name ?? 'Unassigned'}</dd></div>
            <div><dt><Phone /> Phone</dt><dd><a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} className="link">{a.phone}</a></dd></div>
            <div><dt><NotebookPen /> Notes</dt><dd className="detail-notes">{a.notes || <span className="muted">No notes</span>}</dd></div>
          </dl>
          <div>
            <span className="field-label" style={{ marginBottom: 10, display: 'block' }}>Update status</span>
            <div className="status-picker">
              {APPOINTMENT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-option s-${s} ${a.status === s ? 'active' : ''}`}
                  disabled={busy || a.status === s}
                  onClick={() => onStatus(a, s)}
                >
                  <span className="dot" /> {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
