/**
 * Password gate for /lab and /urus.
 *
 * The site is a static Astro build with no adapter, so there is no application
 * code at request time and no way to check a password in the app. This runs on
 * Vercel's edge before any static file is served, which is what makes the gate
 * real: unauthenticated visitors never receive the lab or /urus HTML at all.
 *
 * /urus (the wishlist admin board) is gated here for the same reason, but this
 * only protects the HTML. Client JS cannot reuse a Basic Auth secret, so the
 * page asks separately for the admin passphrase that its RPCs check in the DB.
 * Both layers are needed; neither replaces the other.
 *
 * The secret is deliberately NOT prefixed PUBLIC_ — that prefix is what makes
 * Astro inline a value into the client bundle, which is why the Supabase anon
 * key is readable in view-source. It must never be applied here.
 */
import { next } from '@vercel/functions';

export const config = {
  // Only /lab and /urus and their descendants. Everything else — /, /special,
  // /jemputan, /majlis.ics, /premium/* (the invite's art), /_astro/* — must
  // never be matched, or a guest-facing page breaks.
  matcher: ['/lab', '/lab/:path*', '/urus', '/urus/:path*'],
};

/** Basic Auth username. Not a secret; only the password is. */
const USER = 'lab';

/** Constant-time compare, so a wrong password leaks nothing via response time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function challenge(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Lab", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export default function middleware(request: Request): Response {
  // The portfolio demo has nothing behind /urus or /lab: its database is a
  // fake inside the visitor's browser. Only the demo's Vercel project sets
  // this, so the live gate is unchanged.
  if (process.env.PUBLIC_PORTFOLIO_MODE === 'true') return next();

  const expected = process.env.LAB_PASSWORD;

  // Fail CLOSED, but with a distinct status. A missing or misnamed variable
  // must never silently unlock the labs; returning 401 here instead would make
  // a config mistake indistinguishable from a wrong password.
  if (!expected) {
    return new Response('lab gate not configured', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return challenge();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return challenge();
  }

  const sep = decoded.indexOf(':');
  if (sep === -1) return challenge();

  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  // && short-circuits, so a wrong username skips the password compare. That is
  // fine here: USER is a public, fixed label and only the password is secret.
  const ok = safeEqual(user, USER) && safeEqual(pass, expected);
  if (!ok) return challenge();

  return next();
}
