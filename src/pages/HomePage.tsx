import { useCallback, useState } from 'react';
import { About } from '../components/public/About';
import { Footer } from '../components/public/Footer';
import { Hero } from '../components/public/Hero';
import { Navbar } from '../components/public/Navbar';
import { PublicDataProvider, usePublicData } from '../components/public/PublicDataContext';
import { Services } from '../components/public/Services';
import { scrollToId, useReveal } from '../components/public/useReveal';
import { BookingFlow } from '../components/booking/BookingFlow';
import '../styles/site.css';
import '../styles/booking.css';

function Page() {
  const data = usePublicData();
  const [request, setRequest] = useState<{ serviceId: string; nonce: number } | null>(null);
  useReveal([data.loading, data.services.length, data.masseuses.length]);

  const onBook = useCallback((serviceId: string) => {
    setRequest({ serviceId, nonce: Date.now() });
    scrollToId('booking');
  }, []);

  return (
    <div className="site">
      <Navbar />
      <main>
        <Hero />
        <Services onBook={onBook} />
        <BookingFlow request={request} />
        <About />
      </main>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <PublicDataProvider>
      <Page />
    </PublicDataProvider>
  );
}
