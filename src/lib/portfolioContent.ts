// Server-side only. Page templates import this in their frontmatter, which
// runs at build time. It must never be imported by a client script: it pulls
// in the site content, including the couple's real contact numbers, and those
// would then ship in the browser bundle. Plain constants a script needs belong
// in portfolio.ts instead.
import { site } from '../content/site';
import { PORTFOLIO } from './portfolio';

/** Cash-gift QR. The real one encodes Zul's legal name, so the demo shows a placeholder. */
export const QR_SRC = PORTFOLIO ? '/demo/qr-sample.svg' : '/qr-duitnow.png';

/** Background music. The live song is commercial; the demo plays a royalty-free track. */
export const AUDIO_SRC = PORTFOLIO ? '/demo/music.m4a' : '/audio/lagu.m4a';

/**
 * WhatsApp contacts. The demo keeps the names but drops the numbers: any
 * made-up number could belong to a stranger, who would then get the messages.
 * Templates render a null phone as an unlinked label.
 */
export const CONTACTS: readonly { name: string; role: string; phone: string | null }[] = PORTFOLIO
  ? site.penutup.contacts.map((c) => ({ ...c, phone: null }))
  : site.penutup.contacts;
