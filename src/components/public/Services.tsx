import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import { imageForService } from '../../config/images';
import { formatPrice } from '../../lib/time';
import { formatDurationRange, groupTreatments } from '../../lib/treatments';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from './PublicDataContext';

interface Props {
  onBook: (treatmentKey: string) => void;
}

export function Services({ onBook }: Props) {
  const { services, loading, error, reload } = usePublicData();
  const treatments = groupTreatments(services);

  return (
    <section className="section services" id="services">
      <div className="services-bg" aria-hidden="true" />
      <div className="container">
        <div className="section-head split reveal">
          <div>
            <span className="eyebrow">Our services</span>
            <h2 className="section-title">
              Treatments shaped around <em>how you feel</em> today.
            </h2>
          </div>
          <p className="section-intro">
            Every session begins with a short consultation, so pressure, focus areas and pace are tailored to your
            body. Choose the length that suits you — <Link to="/pricing" className="inline-link">see full pricing</Link>.
          </p>
        </div>

        {loading && (
          <div className="service-grid two">
            {[0, 1].map((i) => (
              <div key={i} className="service-card skeleton-card">
                <div className="skeleton" style={{ aspectRatio: '16 / 10', borderRadius: 20 }} />
                <div className="skeleton" style={{ height: 22, width: '60%', marginTop: 22 }} />
                <div className="skeleton" style={{ height: 14, width: '90%', marginTop: 14 }} />
                <div className="skeleton" style={{ height: 14, width: '75%', marginTop: 8 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="empty-panel reveal">
            <h3>We couldn’t load our service menu</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && treatments.length === 0 && (
          <div className="empty-panel reveal">
            <h3>Our service menu is being refreshed</h3>
            <p>New treatments will appear here shortly. Please check back soon or give the studio a call.</p>
          </div>
        )}

        {!loading && treatments.length > 0 && (
          <div className={`service-grid ${treatments.length <= 2 ? 'two' : ''}`}>
            {treatments.map((t, i) => (
              <article key={t.key} className="service-card reveal" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <button type="button" className="service-media" onClick={() => onBook(t.key)} aria-label={`Book ${t.name}`}>
                  <SmartImage image={imageForService(t.name, i)} className="service-img" />
                  <span className="service-chip">
                    <Clock /> {formatDurationRange(t)}
                  </span>
                  <span className="service-index">{String(i + 1).padStart(2, '0')}</span>
                </button>
                <div className="service-body">
                  <h3>{t.name}</h3>
                  {t.description && <p>{t.description}</p>}
                  <div className="service-foot">
                    <div className="service-price">
                      <span>from</span>
                      <strong>{formatPrice(t.fromPrice)}</strong>
                    </div>
                    <button type="button" className="service-book" onClick={() => onBook(t.key)}>
                      Book <ArrowUpRight />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
