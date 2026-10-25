import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Menu, Phone, X } from 'lucide-react';
import { Logo } from './Logo';
import { usePublicData } from './PublicDataContext';
import { useSectionNav } from './useSectionNav';

const LINKS = [
  { id: 'services', label: 'Services' },
  { id: 'booking', label: 'Booking' },
  { id: 'about', label: 'Our approach' },
  { id: 'visit', label: 'Visit' },
];
const PRICING = { to: '/pricing', label: 'Pricing' };

export function Navbar() {
  const { brandName, settings } = usePublicData();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { onHome, goToSection, navigate } = useSectionNav();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    goToSection(id);
  };

  const phone = settings?.business_phone?.trim();

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''} ${open ? 'nav-open' : ''}`}>
      <div className="container nav-inner">
        <a href="#top" className="nav-brand" onClick={(e) => { e.preventDefault(); setOpen(false); if (onHome) window.scrollTo({ top: 0, behavior: 'smooth' }); else navigate('/'); }} aria-label={`${brandName} home`}>
          <Logo name={brandName} light={!scrolled && !open} />
        </a>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.slice(0, 1).map((l) => (
            <button key={l.id} type="button" className="nav-link" onClick={() => go(l.id)}>
              {l.label}
            </button>
          ))}
          <NavLink to={PRICING.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
            {PRICING.label}
          </NavLink>
          {LINKS.slice(1).map((l) => (
            <button key={l.id} type="button" className="nav-link" onClick={() => go(l.id)}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          {phone && (
            <a className="nav-phone" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
              <Phone /> {phone}
            </a>
          )}
          <button type="button" className={`btn btn-sm ${scrolled || open ? 'btn-primary' : 'btn-light'} nav-cta`} onClick={() => go('booking')}>
            Book your session <ArrowRight className="btn-arrow" />
          </button>
          <button type="button" className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className="nav-mobile" hidden={!open}>
        <div className="container">
          {LINKS.slice(0, 1).map((l) => (
            <button key={l.id} type="button" onClick={() => go(l.id)}>
              {l.label}
              <ArrowRight />
            </button>
          ))}
          <button type="button" onClick={() => { setOpen(false); navigate(PRICING.to); }}>
            {PRICING.label}
            <ArrowRight />
          </button>
          {LINKS.slice(1).map((l) => (
            <button key={l.id} type="button" onClick={() => go(l.id)}>
              {l.label}
              <ArrowRight />
            </button>
          ))}
          <button type="button" className="btn btn-sage btn-block" onClick={() => go('booking')}>
            Book your session
          </button>
        </div>
      </div>
    </header>
  );
}
