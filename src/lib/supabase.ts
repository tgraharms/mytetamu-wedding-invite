import { createPostgrestClient } from './postgrest';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Guard so a missing/empty .env doesn't crash the dev server. Pages still
// render; only live features that talk to Supabase — RSVP, tabung, live lists
// — are inert until real values are set. The anon key is public by design, so
// populating .env exposes nothing secret.
if (!url || !anonKey) {
  console.warn(
    '[supabase] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Pages will render, but RSVP and other live features are disabled. ' +
      'Copy .env.example to .env and fill in the values to enable them.',
  );
}

// Named `supabase` so the six call sites are untouched.
export const supabase = createPostgrestClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
);
