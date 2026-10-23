import { safeFormat } from '../../lib/time';

const stamp = (d: Date) => safeFormat(d, "yyyyMMdd'T'HHmmss", '');

/** Build a downloadable calendar file for a confirmed request. Uses floating local time. */
export function downloadIcs(opts: { title: string; start: Date; end: Date; location?: string; description?: string }) {
  const escape = (s: string) => s.replace(/[\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Massage Therapy//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@massage-booking`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(opts.end)}`,
    `SUMMARY:${escape(opts.title)}`,
    opts.location ? `LOCATION:${escape(opts.location)}` : '',
    opts.description ? `DESCRIPTION:${escape(opts.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'massage-appointment.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
