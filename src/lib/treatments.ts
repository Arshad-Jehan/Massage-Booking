import type { Service } from './types';

/** One treatment (e.g. "Deep Tissue Massage") offered in several session lengths. */
export interface Treatment {
  key: string;
  name: string;
  description: string | null;
  /** Bookable services for this treatment, shortest first. */
  options: Service[];
  minDuration: number;
  maxDuration: number;
  fromPrice: number;
}

export const treatmentKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Group services that share a name into treatments, keeping the order they were first added. */
export function groupTreatments(services: Service[]): Treatment[] {
  const groups = new Map<string, Service[]>();
  for (const s of services) {
    const key = treatmentKey(s.name);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return Array.from(groups.entries()).map(([key, list]) => {
    const options = [...list].sort((a, b) => a.duration_minutes - b.duration_minutes || a.price - b.price);
    return {
      key,
      name: options[0].name.trim(),
      description: options.find((o) => o.description?.trim())?.description ?? null,
      options,
      minDuration: options[0].duration_minutes,
      maxDuration: options[options.length - 1].duration_minutes,
      fromPrice: Math.min(...options.map((o) => o.price)),
    };
  });
}

/** "30 – 90 min", or "60 min" when there is only one length. */
export function formatDurationRange(t: Pick<Treatment, 'minDuration' | 'maxDuration'>): string {
  return t.minDuration === t.maxDuration ? `${t.minDuration} min` : `${t.minDuration} – ${t.maxDuration} min`;
}
