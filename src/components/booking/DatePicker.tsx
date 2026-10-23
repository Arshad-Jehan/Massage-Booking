import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, getDaysInMonth, isSameMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayAvailability } from '../../lib/availability';
import { safeFormat, toDateKey } from '../../lib/time';

interface Props {
  days: DayAvailability[];
  selectedKey: string | null;
  onSelect: (day: DayAvailability) => void;
}

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePicker({ days, selectedKey, onSelect }: Props) {
  const first = days[0]?.date ?? new Date();
  const last = days[days.length - 1]?.date ?? new Date();
  const [month, setMonth] = useState(() => startOfMonth(first));

  const byKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const cells = useMemo(() => {
    const start = startOfMonth(month);
    const lead = (start.getDay() + 6) % 7; // Monday-first grid
    const out: Array<{ date: Date; info?: DayAvailability } | null> = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= getDaysInMonth(month); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      out.push({ date, info: byKey.get(toDateKey(date)) });
    }
    return out;
  }, [month, byKey]);

  const canPrev = !isSameMonth(month, first) && month > first;
  const canNext = endOfMonth(month) < last;

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="icon-btn" onClick={() => setMonth((m) => addMonths(m, -1))} disabled={!canPrev} aria-label="Previous month">
          <ChevronLeft />
        </button>
        <strong>{safeFormat(month, 'MMMM yyyy')}</strong>
        <button type="button" className="icon-btn" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={!canNext} aria-label="Next month">
          <ChevronRight />
        </button>
      </div>
      <div className="calendar-grid" role="grid">
        {WEEK.map((w) => (
          <span key={w} className="calendar-dow">{w}</span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <span key={`blank-${i}`} />;
          const info = cell.info;
          const status = info?.status ?? 'past';
          const selectable = status === 'available';
          const selected = info?.key === selectedKey;
          const title =
            status === 'blocked' ? (info?.reason ? `Closed — ${info.reason}` : 'Studio closed') :
            status === 'closed' ? 'Closed' :
            status === 'full' ? 'Fully booked' :
            status === 'available' ? `${info?.slotCount} times available` : '';
          return (
            <button
              key={toDateKey(cell.date)}
              type="button"
              className={`calendar-day is-${status} ${selected ? 'is-selected' : ''}`}
              disabled={!selectable}
              onClick={() => info && onSelect(info)}
              title={title}
              aria-pressed={selected}
              aria-label={`${safeFormat(cell.date, 'EEEE, MMMM d')}${title ? `, ${title}` : ''}`}
            >
              <span>{cell.date.getDate()}</span>
              {status === 'available' && <i className="calendar-dot" />}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-dot available" /> Available</span>
        <span><i className="legend-dot full" /> Fully booked</span>
        <span><i className="legend-dot closed" /> Closed</span>
      </div>
    </div>
  );
}
