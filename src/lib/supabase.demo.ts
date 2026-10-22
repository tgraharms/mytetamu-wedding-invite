/**
 * Portfolio mode's `supabase`. astro.config.mjs points every import of
 * ./supabase here when PUBLIC_PORTFOLIO_MODE is "true", so the components
 * keep calling the same object and never reach a real database.
 */
import { createDemoClient } from './demoClient';
import { demoSeed } from '../content/demo/seed';
import { DEMO_PASSPHRASE, DEMO_SAVED_EVENT } from './portfolio';

const STATE_KEY = 'portfolio-demo-state';

export const supabase = createDemoClient({
  seed: demoSeed,
  passphrase: DEMO_PASSPHRASE,
  storage: {
    get: () => {
      try {
        return sessionStorage.getItem(STATE_KEY);
      } catch {
        return null;
      }
    },
    set: (value) => {
      try {
        sessionStorage.setItem(STATE_KEY, value);
      } catch {
        /* private mode: the copy lives in memory for this page */
      }
    },
  },
  notify: () => window.dispatchEvent(new CustomEvent(DEMO_SAVED_EVENT)),
});
