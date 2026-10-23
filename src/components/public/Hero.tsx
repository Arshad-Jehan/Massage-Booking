import { useMemo } from 'react';
import { addDays, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ArrowRight, CalendarCheck, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { IMAGES } from '../../config/images';
import { generateSlots } from '../../lib/availability';
import { safeFormat } from '../../lib/time';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from './PublicDataContext';
import { scrollToId } from './useReveal';

export function Hero() {
  const data = usePublicData();

  const nextOpening = useMemo(() => {
    if (data.loading || data.services.length === 0) return null;
    const shortest = data.services.reduce((a, b) => (a.duration_minutes <= b.duration_minutes ? a : b));
    const today = startOfDay(new Date());
    for (let i = 0; i < 21; i++) {
      const day = addDays(today, i);
      const slots = generateSlots(day, shortest, data);
      if (slots.length) return slots[0];
    }
    return null;
  }, [data]);

  const dayLabel = nextOpening
    ? isToday(nextOpening.start)
      ? 'Today'
      : isTomorrow(nextOpening.start)
        ? 'Tomorrow'
        : safeFormat(nextOpening.start, 'EEEE, MMM d')
    : '';

  return (
    <section className="hero" id="top">
      <div className="hero-media" aria-hidden="false">
        <SmartImage image={IMAGES.hero} eager className="hero-img" />
        <div className="hero-shade" />
        <div className="hero-glow" />
      </div>

      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow eyebrow-light hero-rise" style={{ animationDelay: '0.05s' }}>
            <Leaf /> Massage Therapy · Wellness Care
          </span>
          <h1 className="hero-title hero-rise" style={{ animationDelay: '0.15s' }}>
            Unwind the body.
            <br />
            <em>Quiet</em> the mind.
          </h1>
          <p className="hero-lede hero-rise" style={{ animationDelay: '0.28s' }}>
            Unhurried, attentive massage therapy from experienced therapists — in a calm studio designed for rest,
            muscle relief and lasting body balance.
          </p>
          <div className="hero-ctas hero-rise" style={{ animationDelay: '0.4s' }}>
            <button type="button" className="btn btn-lg btn-light" onClick={() => scrollToId('booking')}>
              Book your session <ArrowRight className="btn-arrow" />
            </button>
            <button type="button" className="btn btn-lg btn-glass" onClick={() => scrollToId('services')}>
              Explore services
            </button>
          </div>

          <ul className="hero-trust hero-rise" style={{ animationDelay: '0.52s' }}>
            <li><ShieldCheck /> Experienced, attentive therapists</li>
            <li><Sparkles /> Fresh linens every session</li>
            <li><Leaf /> Pressure tailored to you</li>
          </ul>
        </div>

        <div className="hero-aside hero-rise" style={{ animationDelay: '0.6s' }}>
          <div className="hero-card">
            <SmartImage image={IMAGES.heroDetail} className="hero-card-img" />
            <div className="hero-card-body">
              <span className="hero-card-kicker">
                <CalendarCheck /> {nextOpening ? 'Next opening' : 'Book online'}
              </span>
              {nextOpening ? (
                <>
                  <strong>{dayLabel}</strong>
                  <span>{nextOpening.label}</span>
                </>
              ) : (
                <>
                  <strong>Schedule your visit</strong>
                  <span>Choose a time that suits you</span>
                </>
              )}
              <button type="button" className="hero-card-link" onClick={() => scrollToId('booking')}>
                Book this time <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
