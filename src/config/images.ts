/**
 * All imagery in one place — replace any URL here to restyle the site.
 * Unsplash URLs accept ?w= (width) and &q= (quality) for responsive sizing.
 */

const unsplash = (id: string, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=78`;

export interface SiteImage {
  src: string;
  alt: string;
}

export const IMAGES = {
  hero: {
    src: unsplash('1544161515-4ab6ce6db874', 2000),
    alt: 'Massage therapist warming oil in their hands above a client relaxing face-down on a treatment bed',
  },
  heroDetail: {
    src: unsplash('1515377905703-c4788e51af15', 700),
    alt: 'A drop of aromatic massage oil falling from an amber glass bottle into an open palm',
  },
  aboutMain: {
    src: unsplash('1519823551278-64ac92734fb1', 1200),
    alt: 'Therapist using gentle, focused pressure along a client’s back during a massage session',
  },
  aboutDetail: {
    src: unsplash('1540555700478-4be289fbecef', 800),
    alt: 'Rolled fresh towels, massage lotion, a lit candle and soft pink tulips in the studio',
  },
  aboutRoom: {
    src: unsplash('1596178060671-7a80dc8059ea', 1000),
    alt: 'Overhead view of a client resting under a white towel in a calm, softly lit treatment room',
  },
  bookingAside: {
    src: unsplash('1556760544-74068565f05c', 900),
    alt: 'Massage oils, honey-coloured glass bottles and a candle on a warm wooden surface',
  },
  pricingHero: {
    src: unsplash('1600334089648-b0d9d3028eb2', 2000),
    alt: 'Warm basalt stones placed along a client’s back beside white orchids',
  },
  ambience: {
    src: unsplash('1620733723572-11c53f73a416', 900),
    alt: 'A reed diffuser, folded towel and softly glowing candles',
  },
} satisfies Record<string, SiteImage>;

/** Service imagery, matched by keywords in the service name (first match wins). */
const SERVICE_IMAGE_RULES: Array<{ keywords: string[]; image: SiteImage }> = [
  {
    keywords: ['deep', 'tissue', 'trigger', 'therapeutic'],
    image: { src: unsplash('1519824145371-296894a0daa9', 900), alt: 'Therapist applying slow, deep pressure to the muscles of a client’s back' },
  },
  {
    keywords: ['stone', 'hot'],
    image: { src: unsplash('1600334089648-b0d9d3028eb2', 900), alt: 'Warm basalt stones placed along a client’s spine with white orchids' },
  },
  {
    keywords: ['aroma', 'oil', 'essential'],
    image: { src: unsplash('1556760544-74068565f05c', 900), alt: 'Amber bottles of essential oil beside a lit candle' },
  },
  {
    keywords: ['reflex', 'foot', 'feet'],
    image: { src: unsplash('1519415510236-718bdfcd89c8', 900), alt: 'Gentle foot massage with fresh flowers in a calm treatment room' },
  },
  {
    keywords: ['sport', 'recovery', 'athlet'],
    image: { src: unsplash('1611073615830-9f76902c10fe', 900), alt: 'Therapist’s hands working along a client’s arm during a recovery massage' },
  },
  {
    keywords: ['swedish', 'relax', 'classic', 'calm'],
    image: { src: unsplash('1596178060671-7a80dc8059ea', 900), alt: 'Client relaxing under a crisp white towel in a sunlit treatment room' },
  },
  {
    keywords: ['prenatal', 'pregnan', 'maternity'],
    image: { src: unsplash('1540555700478-4be289fbecef', 900), alt: 'Soft towels, lotion and flowers prepared for a gentle session' },
  },
];

const SERVICE_FALLBACKS: SiteImage[] = [
  { src: unsplash('1544161515-4ab6ce6db874', 900), alt: 'Therapist preparing warm oil for a massage session' },
  { src: unsplash('1610402601271-5b4bd5b3eba4', 900), alt: 'Smooth heated stones resting on a client’s back' },
  { src: unsplash('1515377905703-c4788e51af15', 900), alt: 'Massage oil poured into an open palm' },
  { src: unsplash('1620733723572-11c53f73a416', 900), alt: 'Candles, a reed diffuser and a rolled towel' },
];

export function imageForService(name: string, index: number): SiteImage {
  const lower = name.toLowerCase();
  const rule = SERVICE_IMAGE_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return rule?.image ?? SERVICE_FALLBACKS[index % SERVICE_FALLBACKS.length];
}

/** Brand name used only until business_settings has loaded. */
export const FALLBACK_BRAND = 'Massage Therapy Studio';
