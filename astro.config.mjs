import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv, normalizePath } from 'vite';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';

// .env values are not in process.env while this file runs, so read them the
// way Vite does. On Vercel they are real environment variables either way.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const portfolio = env.PUBLIC_PORTFOLIO_MODE === 'true';

// Portfolio mode only: the real database client, src/lib/supabase.ts, is
// replaced by the in-browser demo database. The swap is keyed on the resolved
// file, not on how an import is spelled, so no spelling of the path can slip
// past it, and it fails the build rather than shipping the real client. The
// live build never adds this plugin, so its module graph, and therefore its
// output, is untouched.
function portfolioDatabase() {
  // Vite hands plugins ids with forward slashes on every OS, so normalise ours.
  const file = (path) => normalizePath(fileURLToPath(new URL(path, import.meta.url)));
  const real = file('./src/lib/supabase.ts');
  const demo = file('./src/lib/supabase.demo.ts');
  const postgrest = file('./src/lib/postgrest.ts');
  return {
    name: 'portfolio-database',
    enforce: 'pre',
    load(id) {
      const loaded = normalizePath(id.split('?')[0]);
      if (loaded === real) return `export * from ${JSON.stringify(demo)};`;
      if (loaded === postgrest) {
        // Only supabase.ts imports postgrest.ts, so in a correct demo build
        // it is never loaded.
        this.error('portfolio mode: src/lib/postgrest.ts was loaded, so the real database client would ship in the demo build.');
      }
      return null;
    },
  };
}

export default defineConfig({
  // The demo deployment sets SITE_URL so its share previews point at itself.
  // The live site ignores it: only portfolio mode reads it.
  site: (portfolio && env.SITE_URL) || 'https://www.mytetamu.my',

  // Astro 7 defaults this to 'jsx', which strips the newline between a text run
  // and a following inline tag — that ate the space in "membuka <strong>Tabung
  // Impian</strong>". `true` keeps v5's lossless behaviour.
  compressHTML: true,

  vite: {
    plugins: [tailwindcss(), ...(portfolio ? [portfolioDatabase()] : [])],
  },

  integrations: [react()],
});
