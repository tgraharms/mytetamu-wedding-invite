// Loaded in the browser as well as at build time (supabase.demo.ts imports it),
// so this file holds plain constants only and must never import site content.

/**
 * True only in the portfolio demo build: set PUBLIC_PORTFOLIO_MODE=true on
 * the demo's Vercel project and nowhere else. Astro inlines the value at
 * build time, so on the live site every branch on this is dead code.
 */
export const PORTFOLIO = import.meta.env.PUBLIC_PORTFOLIO_MODE === 'true';

/** GitHub repo the demo banner links to. Empty hides the link. */
export const REPO_URL: string = import.meta.env.PUBLIC_PORTFOLIO_REPO_URL ?? '';

/** The demo board's published password. Only the sample data is behind it. */
export const DEMO_PASSPHRASE = 'demo-password-2026';

/** Fired on window after every demo write; PortfolioBanner shows the toast. */
export const DEMO_SAVED_EVENT = 'portfolio-demo-saved';

/** sessionStorage marker: present once this tab has started its demo visit. */
export const DEMO_SESSION_KEY = 'portfolio-demo-session';

/**
 * What the real site remembers about a guest between visits: their RSVP,
 * name, phone, the /special popup and the /urus passphrase. A new tab is a new
 * demo visitor, so PortfolioBanner clears these once per tab.
 */
export const DEMO_GUEST_MEMORY = ['rsvp-done', 'rsvp-nama', 'profil-tetamu', 'istimewa-seen', 'kunci-urus'];
