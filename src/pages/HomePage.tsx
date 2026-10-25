import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { About } from '../components/public/About';
import { Footer } from '../components/public/Footer';
import { Hero } from '../components/public/Hero';
import { Navbar } from '../components/public/Navbar';
import { usePublicData } from '../components/public/PublicDataContext';
import { Services } from '../components/public/Services';
import { Team } from '../components/public/Team';
import { scrollToId, useReveal } from '../components/public/useReveal';
import { BookingFlow } from '../components/booking/BookingFlow';
import '../styles/site.css';
import '../styles/booking.css';

type BookingRequest = { treatmentKey?: string; serviceId?: string; nonce: number };

export default function HomePage() {
  const data = usePublicData();
  const location = useLocation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<BookingRequest | null>(null);
  useReveal([data.loading, data.services.length, data.masseuses.length]);

  const onBook = useCallback((treatmentKey: string) => {
    setRequest({ treatmentKey, nonce: Date.now() });
    scrollToId('booking');
  }, []);

  // A session chosen on the pricing page arrives as navigation state.
  useEffect(() => {
    const bookServiceId = (location.state as { bookServiceId?: string } | null)?.bookServiceId;
    if (!bookServiceId || data.loading) return;
    setRequest({ serviceId: bookServiceId, nonce: Date.now() });
    navigate({ pathname: location.pathname, hash: location.hash }, { replace: true, state: null });
  }, [location, data.loading, navigate]);

  // Honour links like /#booking once sections have their final height.
  useEffect(() => {
    if (!location.hash || data.loading) return;
    const t = window.setTimeout(() => scrollToId(location.hash.slice(1)), 80);
    return () => window.clearTimeout(t);
  }, [location.hash, location.key, data.loading]);

  return (
    <div className="site">
      <Navbar />
      <main>
        <Hero />
        <Services onBook={onBook} />
        <Team />
        <BookingFlow request={request} />
        <About />
      </main>
      <Footer />
    </div>
  );
}
