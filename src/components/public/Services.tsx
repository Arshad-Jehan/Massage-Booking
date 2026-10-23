import { ArrowUpRight, Clock } from 'lucide-react';
import { imageForService } from '../../config/images';
import { formatDuration, formatPrice } from '../../lib/time';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from './PublicDataContext';

interface Props {
  onBook: (serviceId: string) => void;
}

export function Services({ onBook }: Props) {
  const { services, loading, error, reload } = usePublicData();

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
            body. Choose a treatment below — you can talk through the details with your therapist on arrival.
          </p>
        </div>

        {loading && (
          <div className="service-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="service-card skeleton-card">
                <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 20 }} />
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

        {!loading && !error && services.length === 0 && (
          <div className="empty-panel reveal">
            <h3>Our service menu is being refreshed</h3>
            <p>New treatments will appear here shortly. Please check back soon or give the studio a call.</p>
          </div>
        )}

        {!loading && services.length > 0 && (
          <div className="service-grid">
            {services.map((service, i) => (
              <article key={service.id} className="service-card reveal" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <button type="button" className="service-media" onClick={() => onBook(service.id)} aria-label={`Book ${service.name}`}>
                  <SmartImage image={imageForService(service.name, i)} className="service-img" />
                  <span className="service-chip">
                    <Clock /> {formatDuration(service.duration_minutes)}
                  </span>
                  <span className="service-index">{String(i + 1).padStart(2, '0')}</span>
                </button>
                <div className="service-body">
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <div className="service-foot">
                    <div className="service-price">
                      <span>from</span>
                      <strong>{formatPrice(service.price)}</strong>
                    </div>
                    <button type="button" className="service-book" onClick={() => onBook(service.id)}>
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
