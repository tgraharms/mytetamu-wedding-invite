/**
 * The slice of supabase-js this site actually uses, over plain fetch.
 *
 * Every call in the codebase is .select(), .insert() or .rpc() against
 * PostgREST — no auth, no realtime, no storage. Importing createClient for
 * that shipped 201 KB to three guest pages.
 *
 * The shape below is deliberately identical to supabase-js so no call site
 * changes. Two details are load-bearing:
 *
 *   - Builders are THENABLE, not promises. Call sites chain .order().limit()
 *     .abortSignal() and only then await, so the request must not be sent
 *     until await. `then` is what triggers it.
 *   - `error.message` carries the PostgREST message verbatim. CadanganHadiah
 *     branches on error.message.includes('sudah_ditempah') to tell "someone
 *     else just reserved this gift" apart from a genuine failure.
 */

export interface PostgrestError {
  message: string;
}

export interface PostgrestResult<T = any> {
  data: T | null;
  error: PostgrestError | null;
}

/** Populated by src/lib/supabase.ts, which owns the env guard. */
interface Config {
  url: string;
  anonKey: string;
}

// Statuses worth a retry: transient upstream/proxy failures, not real answers.
// A 4xx (including the sudah_ditempah conflict) is a real answer and must not
// retry.
const RETRYABLE_STATUSES = new Set([502, 503, 504, 520]);

// Backoff between attempts, in ms. Two retries max (three attempts total),
// comfortably inside the 15s AbortSignal.timeout the call sites set.
const RETRY_DELAYS_MS = [150, 400];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function send(
  cfg: Config,
  pathAndQuery: string,
  init: RequestInit,
): Promise<PostgrestResult> {
  const headers: Record<string, string> = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };

  // postgrest-js retried idempotent GET/HEAD/OPTIONS requests on a network
  // throw or a 502/503/504/520, up to 3 attempts with backoff. The fetch
  // shim dropped that silently, so a single transient Supabase blip now
  // surfaces as "senarai tidak dapat dimuatkan" instead of quietly retrying.
  //
  // This must stay GET-only. A write (POST here — inserts and RPCs, e.g.
  // RSVP submission, guestbook messages, fund contributions, tempah_hadiah /
  // batal_tempahan) can succeed on the server while its response is
  // lost to the same network blip that would trigger a retry. Retrying it
  // would resend the same insert or RPC call and risk a duplicate RSVP or a
  // double-booked gift. There is no idempotency key here to make that safe,
  // so writes get exactly one attempt, full stop.
  const method = (init.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET';
  const maxAttempts = canRetry ? 1 + RETRY_DELAYS_MS.length : 1;

  let lastMessage = 'network error';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // The timeout signal doesn't fire again mid-loop; once aborted it
      // stays aborted, so re-fetching would just replay the same abort
      // error and burn attempts for nothing.
      if (init.signal?.aborted) break;
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    try {
      const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, { ...init, headers });

      if (!res.ok) {
        // PostgREST errors are JSON {message, details, hint, code}. Fall back to
        // the status line if the body is empty or not JSON — an error object
        // without a .message would crash the gift-reservation branch.
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body && typeof body.message === 'string') message = body.message;
        } catch {
          /* keep the status-line fallback */
        }

        if (canRetry && RETRYABLE_STATUSES.has(res.status) && attempt < maxAttempts - 1) {
          lastMessage = message;
          continue;
        }
        return { data: null, error: { message } };
      }

      // 204 No Content is what a return=minimal insert answers with.
      if (res.status === 204) return { data: null, error: null };

      const text = await res.text();
      return { data: text ? JSON.parse(text) : null, error: null };
    } catch (e) {
      // Network failure or AbortSignal.timeout firing.
      lastMessage = e instanceof Error ? e.message : 'network error';
      if (canRetry && attempt < maxAttempts - 1) continue;
      return { data: null, error: { message: lastMessage } };
    }
  }

  return { data: null, error: { message: lastMessage } };
}

class SelectBuilder implements PromiseLike<PostgrestResult> {
  #params: string[] = [];
  #signal?: AbortSignal;

  constructor(private cfg: Config, private table: string, columns: string) {
    // supabase-js sends select=* when no columns are given, and strips the
    // spaces out of a list like 'nama, mesej'.
    this.#params.push(`select=${encodeURIComponent(columns.replace(/\s+/g, ''))}`);
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    const dir = opts?.ascending === false ? 'desc' : 'asc';
    this.#params.push(`order=${encodeURIComponent(column)}.${dir}`);
    return this;
  }

  limit(n: number): this {
    this.#params.push(`limit=${n}`);
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    this.#signal = signal;
    return this;
  }

  then<R1 = PostgrestResult, R2 = never>(
    onfulfilled?: ((v: PostgrestResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return send(this.cfg, `${this.table}?${this.#params.join('&')}`, {
      method: 'GET',
      signal: this.#signal,
    }).then(onfulfilled, onrejected);
  }
}

class InsertBuilder implements PromiseLike<PostgrestResult> {
  #signal?: AbortSignal;

  constructor(private cfg: Config, private table: string, private row: unknown) {}

  abortSignal(signal: AbortSignal): this {
    this.#signal = signal;
    return this;
  }

  then<R1 = PostgrestResult, R2 = never>(
    onfulfilled?: ((v: PostgrestResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return send(this.cfg, this.table, {
      method: 'POST',
      // return=minimal matches supabase-js's default for a bare .insert():
      // the call sites only look at `error`, so there is no reason to ask the
      // database to serialise the row back.
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(this.row),
      signal: this.#signal,
    }).then(onfulfilled, onrejected);
  }
}

class RpcBuilder implements PromiseLike<PostgrestResult> {
  #signal?: AbortSignal;

  constructor(private cfg: Config, private fn: string, private params: unknown) {}

  abortSignal(signal: AbortSignal): this {
    this.#signal = signal;
    return this;
  }

  then<R1 = PostgrestResult, R2 = never>(
    onfulfilled?: ((v: PostgrestResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return send(this.cfg, `rpc/${this.fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.params ?? {}),
      signal: this.#signal,
    }).then(onfulfilled, onrejected);
  }
}

export function createPostgrestClient(url: string, anonKey: string) {
  const cfg: Config = { url: url.replace(/\/+$/, ''), anonKey };
  return {
    from(table: string) {
      return {
        select: (columns = '*') => new SelectBuilder(cfg, table, columns),
        insert: (row: unknown) => new InsertBuilder(cfg, table, row),
      };
    },
    rpc(fn: string, params?: unknown) {
      return new RpcBuilder(cfg, fn, params);
    },
  };
}
