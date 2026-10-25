import { useMemo } from 'react';
import { ArrowRight, CalendarCheck, MessagesSquare, Phone, Wallet } from 'lucide-react';
import { IMAGES, imageForService } from '../config/images';
import { formatPrice } from '../lib/time';
import { formatDurationRange, groupTreatments } from '../lib/treatments';
import { SmartImage } from '../components/ui/SmartImage';
import { Footer } from '../components/public/Footer';
import { Navbar } from '../components/public/Navbar';
import { usePublicData } from '../components/public/PublicDataContext';
import { useReveal } from '../components/public/useReveal';
import { useSectionNav } from '../components/public/useSectionNav';
import '../styles/site.css';

export default function PricingPage() {
  const { services, settings, loading, error, reload } = usePublicData();
  const { bookService, goToSection } = useSectionNav();
  const treatments = useMemo(() => groupTreatments(services), [services]);
  const phone = settings?.business_phone?.trim();
  useReveal([loading, treatments.length]);

  return (
    <div className="site">
      <Navbar />
      <main>
        <section className="page-hero">
          <SmartImage image={IMAGES.pricingHero} eager className="page-hero-img" />
          <div className="page-hero-shade" />
          <div className="container page-hero-inner">
            <span className="eyebrow eyebrow-light hero-rise">Pricing</span>
            <h1 className="hero-rise" style={{ animationDelay: '0.1s' }}>
              Simple, <em>clear</em> pricing.
            </h1>
            <p className="hero-rise" style={{ animationDelay: '0.2s' }}>
              One price for each session length. Every treatment includes a short consultation, and you pay at the
              studio after your session.
            </p>
          </div>
        </section>

        <section className="section pricing">
          <div className="services-bg" aria-hidden="true" />
          <div className="container">
            {loading && (
              <div className="price-grid">
                {[0, 1].map((i) => (
                  <div key={i} className="price-card">
                    <div className="skeleton" style={{ height: 200, borderRadius: 0 }} />
                    <div className="price-card-body">
                      {[0, 1, 2, 3].map((r) => (
                        <div key={r} className="skeleton" style={{ height: 22, marginTop: 18 }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="empty-panel">
                <h3>We couldn’t load our prices</h3>
                <p>{error}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>Try again</button>
              </div>
            )}

            {!loading && !error && treatments.length === 0 && (
              <div className="empty-panel">
                <h3>Our price list is being updated</h3>
                <p>Please check back soon{phone ? ` or call us on ${phone}` : ''}.</p>
              </div>
            )}

            {!loading && treatments.length > 0 && (
              <div className="price-grid">
                {treatments.map((t, i) => (
                  <article key={t.key} className="price-card reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                    <div className="price-card-media">
                      <SmartImage image={imageForService(t.name, i)} className="price-card-img" />
                      <span className="service-chip">{formatDurationRange(t)}</span>
                    </div>
                    <div className="price-card-body">
                      <div className="price-card-head">
                        <h2>{t.name}</h2>
                        <span className="price-from">From <strong>{formatPrice(t.fromPrice)}</strong></span>
                      </div>
                      {t.description && <p className="price-card-desc">{t.description}</p>}

                      <ul className="price-list" aria-label={`${t.name} prices`}>
                        {t.options.map((o) => (
                          <li key={o.id}>
                            <span className="pl-duration">{o.duration_minutes} min</span>
                            <span className="pl-line" aria-hidden="true" />
                            <span className="pl-price">{formatPrice(o.price)}</span>
                            <button type="button" className="pl-book" onClick={() => bookService(o.id)} aria-label={`Book ${t.name}, ${o.duration_minutes} minutes`}>
                              Book <ArrowRight />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="price-notes reveal">
              <div>
                <MessagesSquare />
                <strong>Consultation included</strong>
                <span>Every session starts with a short chat about pressure and focus areas.</span>
              </div>
              <div>
                <Wallet />
                <strong>Pay after your session</strong>
                <span>Payment is taken at the studio once your treatment is finished.</span>
              </div>
              <div>
                <Phone />
                <strong>Need to change plans?</strong>
                <span>{phone ? `Call us on ${phone} and we’ll find another time.` : 'Just give the studio a call and we’ll find another time.'}</span>
              </div>
            </div>

            <div className="price-cta reveal">
              <div>
                <h3>Ready when you are.</h3>
                <p>Pick a treatment and a time that suits you — it only takes a minute.</p>
              </div>
              <button type="button" className="btn btn-lg btn-primary" onClick={() => goToSection('booking')}>
                <CalendarCheck /> Book your session
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
