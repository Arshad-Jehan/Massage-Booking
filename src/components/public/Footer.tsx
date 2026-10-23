import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react';
import { WEEKDAYS, formatTimeValue } from '../../lib/time';
import { Logo } from './Logo';
import { usePublicData } from './PublicDataContext';
import { scrollToId } from './useReveal';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Footer() {
  const { brandName, settings, hours } = usePublicData();
  const phone = settings?.business_phone?.trim();
  const address = settings?.business_address?.trim();
  const sorted = ORDER.map((d) => hours.find((h) => h.weekday === d)).filter(Boolean) as typeof hours;

  return (
    <footer className="footer" id="visit">
      <div className="footer-glow" aria-hidden="true" />
      <div className="container">
        <div className="footer-cta">
          <div>
            <span className="eyebrow eyebrow-light">Schedule your visit</span>
            <h2>
              Make time for <em>yourself</em> this week.
            </h2>
          </div>
          <button type="button" className="btn btn-lg btn-light" onClick={() => scrollToId('booking')}>
            Book your session <ArrowUpRight className="btn-arrow" />
          </button>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo name={brandName} light />
            <p>Professional massage therapy and wellness care in a calm, welcoming studio.</p>
          </div>

          <div className="footer-col">
            <h4>Visit</h4>
            {address ? (
              <a className="footer-item" href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                <MapPin /> <span>{address}</span>
              </a>
            ) : (
              <p className="footer-item muted"><MapPin /> <span>Address coming soon</span></p>
            )}
            {phone && (
              <a className="footer-item" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                <Phone /> <span>{phone}</span>
              </a>
            )}
          </div>

          <div className="footer-col footer-hours">
            <h4><Clock /> Opening hours</h4>
            <ul>
              {sorted.map((h) => (
                <li key={h.weekday} className={new Date().getDay() === h.weekday ? 'today' : ''}>
                  <span>{WEEKDAYS[h.weekday]}</span>
                  <span>{h.is_open ? `${formatTimeValue(h.start_time)} – ${formatTimeValue(h.end_time)}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
          <span className="footer-links">
            <button type="button" onClick={() => scrollToId('services')}>Services</button>
            <button type="button" onClick={() => scrollToId('booking')}>Book online</button>
            <Link to="/admin">Studio login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
