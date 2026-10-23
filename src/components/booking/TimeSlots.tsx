import { Moon, Sun, Sunrise } from 'lucide-react';
import type { StaffedSlot } from '../../lib/availability';

interface Props {
  slots: StaffedSlot[];
  selected: StaffedSlot | null;
  onSelect: (slot: StaffedSlot) => void;
}

const GROUPS = [
  { key: 'morning', label: 'Morning', icon: Sunrise, test: (h: number) => h < 12 },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening', icon: Moon, test: (h: number) => h >= 17 },
];

export function TimeSlots({ slots, selected, onSelect }: Props) {
  return (
    <div className="slot-groups">
      {GROUPS.map((g) => {
        const items = slots.filter((s) => g.test(s.start.getHours()));
        if (!items.length) return null;
        return (
          <div key={g.key} className="slot-group">
            <div className="slot-group-label">
              <g.icon /> {g.label}
              <span>{items.length} open</span>
            </div>
            <div className="slot-grid">
              {items.map((slot) => {
                const isSel = selected?.start.getTime() === slot.start.getTime();
                return (
                  <button
                    key={slot.start.toISOString()}
                    type="button"
                    className={`slot ${isSel ? 'is-selected' : ''}`}
                    onClick={() => onSelect(slot)}
                    aria-pressed={isSel}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
