import { useMemo } from 'react';
import { addDays, startOfDay } from 'date-fns';
import { generateSlots } from '../../lib/availability';
import { safeFormat } from '../../lib/time';
import type { Masseuse } from '../../lib/types';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from './PublicDataContext';

const WEEK_DAYS = 7;

type Tone = 'today' | 'soon' | 'none';
interface Status {
  tone: Tone;
  label: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/**
 * Each therapist's next bookable day this week, using the same rules as the booking flow
 * (working days, opening hours, blocked dates, existing appointments and booking notice).
 */
function useTeamStatus(): Map<string, Status> | null {
  const data = usePublicData();
  return useMemo(() => {
    if (data.loading || data.bookingError) return null;
    const probe = data.services.length
      ? data.services.reduce((a, b) => (a.duration_minutes <= b.duration_minutes ? a : b))
      : { duration_minutes: 30 };
    const today = startOfDay(new Date());
    const freeByDay = Array.from({ length: WEEK_DAYS }, (_, i) => {
      const ids = new Set<string>();
      for (const slot of generateSlots(addDays(today, i), probe, data)) slot.masseuseIds.forEach((id) => ids.add(id));
      return ids;
    });

    const result = new Map<string, Status>();
    for (const m of data.masseuses) {
      const next = freeByDay.findIndex((ids) => ids.has(m.id));
      result.set(
        m.id,
        next === 0
          ? { tone: 'today', label: 'Available today' }
          : next === 1
            ? { tone: 'soon', label: 'Available tomorrow' }
            : next > 1
              ? { tone: 'soon', label: `Available ${safeFormat(addDays(today, next), 'EEEE')}` }
              : { tone: 'none', label: 'Unavailable' },
      );
    }
    return result;
  }, [data]);
}

export function Team() {
  const { masseuses, loading } = usePublicData();
  const statuses = useTeamStatus();

  if (!loading && masseuses.length === 0) return null;

  return (
    <section className="section team-section" id="team">
      <div className="container">
        <div className="section-head split reveal">
          <div>
            <span className="eyebrow">Your therapists</span>
            <h2 className="section-title">
              Meet the team <em>caring for you.</em>
            </h2>
          </div>
          <p className="section-intro">
            See who’s available at a glance. You can choose your therapist — or let us match you — when you book below.
          </p>
        </div>

        <div className="team-grid">
          {loading
            ? [0, 1].map((i) => <div key={i} className="team-card skeleton" style={{ height: 112 }} />)
            : masseuses.map((m: Masseuse) => {
                const status = statuses?.get(m.id);
                return (
                  <article key={m.id} className="team-card reveal">
                    <div className="team-avatar">
                      {m.photo_url ? <SmartImage image={{ src: m.photo_url, alt: `Portrait of ${m.name}` }} /> : <span>{initials(m.name)}</span>}
                    </div>
                    <div className="team-info">
                      <h4>{m.name}</h4>
                      {m.title && <p className="team-title">{m.title}</p>}
                      {m.specialties && <p className="team-spec">{m.specialties}</p>}
                      {status && (
                        <span className={`team-status is-${status.tone}`}>
                          <i aria-hidden="true" /> {status.label}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
        </div>
      </div>
    </section>
  );
}
