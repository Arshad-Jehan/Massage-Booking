import type { AppointmentStatus } from '../../lib/types';

const LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="dot" />
      {LABELS[status] ?? status}
    </span>
  );
}

export const statusLabel = (s: AppointmentStatus) => LABELS[s] ?? s;
