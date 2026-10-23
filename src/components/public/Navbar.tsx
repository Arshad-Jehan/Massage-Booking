import { useEffect, useState } from 'react';
import { ArrowRight, Menu, Phone, X } from 'lucide-react';
import { Logo } from './Logo';
import { usePublicData } from './PublicDataContext';
import { scrollToId } from './useReveal';

const LINKS = [
  { id: 'services', label: 'Services' },
  { id: 'booking', label: 'Booking' },
  { id: 'about', label: 'Our approach' },
  { id: 'visit', label: 'Visit' },
];

export function Navbar() {
  const { brandName, settings } = usePublicData();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    scrollToId(id);
  };

  const phone = settings?.business_phone?.trim();

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''} ${open ? 'nav-open' : ''}`}>
      <div className="container nav-inner">
        <a href="#top" className="nav-brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={`${brandName} home`}>
          <Logo name={brandName} light={!scrolled && !open} />
        </a>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
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
          {LINKS.map((l) => (
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
