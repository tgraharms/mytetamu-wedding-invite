import { site } from '../content/site';

export function toIcsUtc(dateISO: string, time: string): string {
  return new Date(`${dateISO}T${time}:00+08:00`)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function googleCalendarUrl(): string {
  const start = toIcsUtc(site.event.dateISO, site.event.timeStart);
  const end = toIcsUtc(site.event.dateISO, site.event.timeEnd);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: site.meta.title,
    dates: `${start}/${end}`,
    location: `${site.venue.name}, ${site.venue.address}`,
    details: site.meta.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Google menolak URL "output=embed" lama (redirect consent → frame kosong).
// Format /maps/embed?pb= rasmi berfungsi tanpa API key; !2z ialah koordinat DMS dalam base64.
function toDms(value: number, pos: string, neg: string): string {
  const hemi = value < 0 ? neg : pos;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min}'${sec}"${hemi}`;
}

export const mapEmbedUrl = (() => {
  const dms = `${toDms(site.venue.lat, 'N', 'S')} ${toDms(site.venue.lng, 'E', 'W')}`;
  const b64 = Buffer.from(dms, 'utf8').toString('base64');
  const pb =
    `!1m18!1m12!1m3!1d3986.0!2d${site.venue.lng}!3d${site.venue.lat}` +
    `!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1` +
    `!3m3!1m2!1s0x0:0x0!2z${encodeURIComponent(b64)}` +
    `!5e0!3m2!1sms!2smy!4v1751567000000!5m2!1sms!2smy`;
  return `https://www.google.com/maps/embed?pb=${pb}`;
})();
export const whatsappUrl = (phone: string) => `https://wa.me/${phone}`;
