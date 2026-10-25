import { Droplets, HeartHandshake, MessagesSquare, Wind } from 'lucide-react';
import { IMAGES } from '../../config/images';
import { SmartImage } from '../ui/SmartImage';
import { usePublicData } from './PublicDataContext';

const RITUAL = [
  {
    icon: MessagesSquare,
    title: 'Consultation',
    text: 'A few unhurried minutes to talk through how you feel, any areas of tension and the pressure you prefer.',
  },
  {
    icon: HeartHandshake,
    title: 'Your session',
    text: 'Focused, attentive therapy in a warm, quiet room — with your comfort checked in on throughout.',
  },
  {
    icon: Wind,
    title: 'Aftercare',
    text: 'Time to rest, a glass of water and simple stretches or tips to help you carry the calm into your week.',
  },
];

export function About() {
  const { brandName } = usePublicData();

  return (
    <section className="section about" id="about">
      <div className="container">
        <div className="about-grid">
          <div className="about-visual reveal">
            <SmartImage image={IMAGES.aboutMain} className="about-img-main" />
            <SmartImage image={IMAGES.aboutDetail} className="about-img-detail" />
            <div className="about-quote">
              <Droplets />
              <p>“Good massage therapy is about listening — to the client first, and then to the body.”</p>
            </div>
          </div>

          <div className="about-copy reveal">
            <span className="eyebrow">Our approach</span>
            <h2 className="section-title">
              A calm studio, <em>built around</em> rest and professional care.
            </h2>
            <p className="lead">
              At {brandName}, every detail is considered so you can simply let go — softly lit treatment rooms, freshly
              laundered linens for every client, warm oils and therapists who take the time to understand what your
              body needs.
            </p>
            <p className="muted">
              Whether you’re easing desk-bound shoulders, supporting muscle health between training days, or simply
              looking for an hour of quiet, we’ll shape each session around you.
            </p>

            <ol className="ritual">
              {RITUAL.map((step, i) => (
                <li key={step.title}>
                  <span className="ritual-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="ritual-icon">
                    <step.icon />
                  </div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="ambience reveal">
          <SmartImage image={IMAGES.aboutRoom} className="ambience-img" />
          <div className="ambience-copy">
            <span className="eyebrow eyebrow-light">The studio</span>
            <h3>Clean, quiet rooms. Crisp linens. Warmth in every detail.</h3>
            <p>Arrive a few minutes early to settle in and leave the day at the door — we’ll take it from there.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
