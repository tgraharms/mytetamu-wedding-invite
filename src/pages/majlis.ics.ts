import type { APIRoute } from 'astro';
import { site } from '../content/site';
import { toIcsUtc } from '../lib/links';

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export const GET: APIRoute = () => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//wedding-landing-page//MS',
    'BEGIN:VEVENT',
    `UID:majlis-${site.event.dateISO}@wedding-landing-page`,
    `DTSTAMP:${toIcsUtc(site.event.dateISO, site.event.timeStart)}`,
    `DTSTART:${toIcsUtc(site.event.dateISO, site.event.timeStart)}`,
    `DTEND:${toIcsUtc(site.event.dateISO, site.event.timeEnd)}`,
    `SUMMARY:${icsEscape(site.meta.title)}`,
    `LOCATION:${icsEscape(`${site.venue.name}, ${site.venue.address}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
