/**
 * Portfolio mode's stand-in for src/lib/postgrest.ts.
 *
 * Same surface the components already call (from().select(), from().insert()
 * and rpc(), each awaited and each answering { data, error }), but answered
 * from an in-browser copy of sample data instead of Supabase. Writes really
 * change that copy, so a visitor can RSVP on / and then find it on /urus. The
 * copy lives in sessionStorage and disappears when the tab closes.
 *
 * Only the portfolio build loads this file (see portfolioDatabase() in
 * astro.config.mjs). It has no runtime imports on purpose: the Node tests run
 * it directly, the way scripts/urus-doa.test.mjs runs urusDoa.ts.
 *
 * Each rpc handler mirrors its SQL twin: the same argument names, the same
 * result shape, the same error codes in error.message, checked in the same
 * order. The components branch on those codes, so they must match exactly.
 */

export interface DemoError { message: string }
export interface DemoResult { data: any; error: DemoError | null }

export interface GiftRow { id: number; nama: string; pautan: string; gambar_url: string; nota: string; aktif: boolean; urutan: number }
export interface FundRow { id: number; nama: string; sasaran: number; emoji: string; aktif: boolean; urutan: number }
export interface AktivitiRow {
  id: number; nama: string; kategori: string; jarak: string; pautan: string; nota: string;
  aktif: boolean; urutan: number; imej: string; lencana: string;
}
export interface DoaRow { id: number; nama: string; mesej: string; created_at: string }
export interface RsvpRow { id: string; nama: string; pax: number; bermalam: boolean | null; created_at: string }
export interface GuestRow { id: number; telefon: string; nama: string; created_at: string }
export interface ReservationRow { id: number; gift_item_id: number; guest_id: number; created_at: string }
export interface ContributionRow { id: number; goal_id: number; guest_id: number; amaun: number; created_at: string }

export interface DemoState {
  /** Bump when the seed changes, so tabs holding an older copy start over. */
  version: number;
  gift_item: GiftRow[];
  fund_goal: FundRow[];
  aktiviti: AktivitiRow[];
  doa: DoaRow[];
  rsvp: RsvpRow[];
  guest: GuestRow[];
  reservation: ReservationRow[];
  contribution: ContributionRow[];
}

export interface DemoStorage {
  get(): string | null;
  set(value: string): void;
}

export interface DemoClientOptions {
  seed: DemoState;
  /** The only passphrase the demo board accepts. */
  passphrase: string;
  storage?: DemoStorage;
  /** Called after every successful write; the page shows "nothing was saved". */
  notify?: () => void;
  /** Fake network time, so loading states show the way they do live. */
  delayMs?: number;
  now?: () => Date;
  uuid?: () => string;
}

type Handler = (s: DemoState, p: Record<string, any>, now: string) => DemoResult;

// Tables a visitor's anon key can read on the real site. RLS closes the rest
// there, so they stay closed here.
const READABLE = new Set(['gift_item', 'fund_goal', 'aktiviti', 'doa']);

// Filled by the guest and admin sections further down.
const RPC: Record<string, Handler> = {};

// RPCs that change data. A successful one persists the copy and calls notify().
const WRITES = new Set<string>();

// crypto.randomUUID needs a secure context, and a phone preview over the LAN
// (plain http) is not one. getRandomValues works everywhere.
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function ok(data: any = null): DemoResult {
  return { data, error: null };
}

function fail(message: string): DemoResult {
  return { data: null, error: { message } };
}

function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

/** Twin of left(btrim(x), n): trims, then keeps the first n code points, so an emoji is never cut in half. */
function clip(raw: unknown, n: number): string {
  return Array.from(String(raw ?? '').trim()).slice(0, n).join('');
}

function newestFirst<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function removeById<T extends { id: number | string }>(rows: T[], id: number | string): boolean {
  const i = rows.findIndex((r) => r.id === id);
  if (i === -1) return false;
  rows.splice(i, 1);
  return true;
}

function sortRows(rows: Record<string, any>[], orders: { column: string; ascending: boolean }[]) {
  return [...rows].sort((a, b) => {
    for (const { column, ascending } of orders) {
      if (a[column] === b[column]) continue;
      const cmp = a[column] < b[column] ? -1 : 1;
      return ascending ? cmp : -cmp;
    }
    return 0;
  });
}

// select('nama, mesej') returns only those keys; select('*') copies the row.
function project(rows: Record<string, any>[], columns: string) {
  const list = columns.replace(/\s+/g, '');
  if (list === '' || list === '*') return rows.map((r) => ({ ...r }));
  const keys = list.split(',');
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
}

// The two tables guests may insert into, with the same limits as their CHECKs.
function runInsert(s: DemoState, table: string, row: any, now: string, uuid: () => string): DemoResult {
  if (table === 'rsvp') {
    const nama = String(row?.nama ?? '').trim();
    const pax = Number(row?.pax);
    if (nama === '' || !Number.isInteger(pax) || pax < 1) {
      return fail('new row for relation "rsvp" violates check constraint');
    }
    const bermalam = typeof row.bermalam === 'boolean' ? row.bermalam : null;
    s.rsvp.push({ id: uuid(), nama, pax, bermalam, created_at: now });
    return ok();
  }
  if (table === 'doa') {
    const nama = String(row?.nama ?? '').trim();
    const mesej = String(row?.mesej ?? '').trim();
    if (nama.length < 1 || nama.length > 100 || mesej.length < 1 || mesej.length > 500) {
      return fail('new row for relation "doa" violates check constraint');
    }
    s.doa.push({ id: nextId(s.doa), nama, mesej, created_at: now });
    return ok();
  }
  return fail(`demo: no insert on ${table}`);
}

export function createDemoClient(opts: DemoClientOptions) {
  const delayMs = opts.delayMs ?? 300;
  const clock = opts.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const uuid = opts.uuid ?? randomId;
  const state = load();

  function load(): DemoState {
    try {
      const raw = opts.storage?.get();
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.version === opts.seed.version) return saved;
      }
    } catch {
      /* corrupt or blocked storage: start over from the seed */
    }
    return structuredClone(opts.seed);
  }

  function commit(): void {
    try {
      opts.storage?.set(JSON.stringify(state));
    } catch {
      /* storage blocked: the copy still lives in memory for this page */
    }
    opts.notify?.();
  }

  // Resolve after the fake network delay. Never rejects, same as postgrest.ts.
  function respond(run: () => DemoResult): Promise<DemoResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          resolve(run());
        } catch (e) {
          resolve(fail(e instanceof Error ? e.message : 'demo error'));
        }
      }, delayMs);
    });
  }

  // Builders do nothing until awaited, like postgrest.ts, so call sites can
  // chain .order().limit().abortSignal() first.
  function deferred(run: () => DemoResult) {
    const builder = {
      abortSignal(_signal: AbortSignal) {
        return builder;
      },
      then<R1 = DemoResult, R2 = never>(
        onfulfilled?: ((v: DemoResult) => R1 | PromiseLike<R1>) | null,
        onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null,
      ): PromiseLike<R1 | R2> {
        return respond(run).then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  function select(table: string, columns: string) {
    const orders: { column: string; ascending: boolean }[] = [];
    let max: number | undefined;
    const builder = Object.assign(
      deferred(() => {
        if (!READABLE.has(table)) return fail(`demo: ${table} is not readable`);
        // RLS hides inactive rows from guests on the real site.
        const visible = (state as any)[table].filter((r: any) => r.aktif !== false);
        const sorted = sortRows(visible, orders);
        return ok(project(max === undefined ? sorted : sorted.slice(0, max), columns));
      }),
      {
        order(column: string, o?: { ascending?: boolean }) {
          orders.push({ column, ascending: o?.ascending !== false });
          return builder;
        },
        limit(n: number) {
          max = n;
          return builder;
        },
      },
    );
    return builder;
  }

  return {
    from(table: string) {
      return {
        select: (columns = '*') => select(table, columns),
        insert: (row: unknown) =>
          deferred(() => {
            const result = runInsert(state, table, row, now(), uuid);
            if (!result.error) commit();
            return result;
          }),
      };
    },
    rpc(fn: string, params?: Record<string, any>) {
      return deferred(() => {
        const handler = RPC[fn];
        if (!handler) return fail(`demo: unknown rpc ${fn}`);
        const p = params ?? {};
        // The demo board opens only with the published demo passphrase, the way
        // the real one checks its bcrypt hash. The unknown-rpc check above runs first.
        if (fn.startsWith('urus_') && p.p_kunci !== opts.passphrase) {
          return fail('kunci_salah');
        }
        const result = handler(state, p, now());
        // A delete that found nothing (data === false) changed nothing.
        if (!result.error && WRITES.has(fn) && result.data !== false) commit();
        return result;
      });
    },
  };
}

// ---- Guest RPCs (the gift registry on /special) ----

/** Twin of normalkan_telefon(): digits only, a leading 0 becomes 60, then 10 to 15 digits. */
export function normalkanTelefon(raw: unknown): string | null {
  let v = String(raw ?? '').replace(/\D/g, '');
  if (v.startsWith('0')) v = '60' + v.slice(1);
  return v.length < 10 || v.length > 15 ? null : v;
}

function guestByPhone(s: DemoState, telefon: string): GuestRow | undefined {
  return s.guest.find((g) => g.telefon === telefon);
}

const senarai_ditempah: Handler = (s) => ok(s.reservation.map((r) => r.gift_item_id));

const status_tetamu: Handler = (s, p) => {
  const telefon = normalkanTelefon(p.p_telefon);
  if (!telefon) return fail('telefon_tidak_sah');
  const g = guestByPhone(s, telefon);
  // nama stays null on purpose, as in the SQL: a phone number must not reveal a name.
  if (!g) return ok({ nama: null, tempahan: [], sumbangan: [] });
  return ok({
    nama: null,
    tempahan: s.reservation.filter((r) => r.guest_id === g.id).map((r) => r.gift_item_id),
    sumbangan: s.contribution
      .filter((c) => c.guest_id === g.id)
      .map((c) => ({ goal_id: c.goal_id, amaun: c.amaun })),
  });
};

// Checks run in the SQL's order, and all of them run before anything changes.
// That matches the SQL rolling back its guest upsert when a later check raises.
const tempah_hadiah: Handler = (s, p, now) => {
  const giftId = Number(p.p_gift_item_id);
  if (!s.gift_item.some((g) => g.id === giftId && g.aktif)) return fail('hadiah_tiada');
  const telefon = normalkanTelefon(p.p_telefon);
  if (!telefon) return fail('telefon_tidak_sah');
  const nama = clip(p.p_nama, 100);
  if (nama === '') return fail('nama_diperlukan');
  const existing = guestByPhone(s, telefon);
  if (existing && s.reservation.filter((r) => r.guest_id === existing.id).length >= 2) {
    return fail('had_capai');
  }
  if (s.reservation.some((r) => r.gift_item_id === giftId)) return fail('sudah_ditempah');

  let guest = existing;
  if (guest) {
    guest.nama = nama;
  } else {
    guest = { id: nextId(s.guest), telefon, nama, created_at: now };
    s.guest.push(guest);
  }
  s.reservation.push({ id: nextId(s.reservation), gift_item_id: giftId, guest_id: guest.id, created_at: now });
  return ok(null);
};

const batal_tempahan: Handler = (s, p) => {
  const telefon = normalkanTelefon(p.p_telefon);
  if (!telefon) return fail('telefon_tidak_sah');
  const g = guestByPhone(s, telefon);
  const giftId = Number(p.p_gift_item_id);
  const i = g ? s.reservation.findIndex((r) => r.guest_id === g.id && r.gift_item_id === giftId) : -1;
  if (i === -1) return ok(false);
  s.reservation.splice(i, 1);
  return ok(true);
};

Object.assign(RPC, { senarai_ditempah, status_tetamu, tempah_hadiah, batal_tempahan });
WRITES.add('tempah_hadiah').add('batal_tempahan');

// ---- Admin RPCs (/urus). The passphrase check lives in rpc() above. ----

function byUrutan<T extends { urutan: number; id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.urutan - b.urutan || a.id - b.id);
}

/** Twin of semak_pautan(): empty, or an http(s) link up to 500 characters. null means pautan_tidak_sah. */
function semakPautan(raw: unknown): string | null {
  const v = String(raw ?? '').trim();
  if (v === '') return '';
  return /^https?:\/\//i.test(v) ? clip(v, 500) : null;
}

const urus_overview: Handler = (s) => {
  const gift = (id: number) => s.gift_item.find((g) => g.id === id);
  const goal = (id: number) => s.fund_goal.find((f) => f.id === id);
  const guest = (id: number) => s.guest.find((g) => g.id === id);
  const tempahan = newestFirst(s.reservation).map((r) => ({
    id: r.id,
    hadiah: gift(r.gift_item_id)?.nama ?? '',
    hadiah_aktif: gift(r.gift_item_id)?.aktif ?? false,
    nama: guest(r.guest_id)?.nama ?? '',
    telefon: guest(r.guest_id)?.telefon ?? '',
    pada: r.created_at,
  }));
  const sumbangan = newestFirst(s.contribution).map((c) => ({
    id: c.id,
    tabung: goal(c.goal_id)?.nama ?? '',
    nama: guest(c.guest_id)?.nama ?? '',
    telefon: guest(c.guest_id)?.telefon ?? '',
    amaun: c.amaun,
    pada: c.created_at,
  }));
  return ok({
    tempahan,
    sumbangan,
    jumlah: { tempahan: tempahan.length, sumbangan: sumbangan.length, rm: sumbangan.reduce((t, c) => t + c.amaun, 0) },
  });
};

const urus_batal_tempahan: Handler = (s, p) => ok(removeById(s.reservation, Number(p.p_reservation_id)));
const urus_padam_sumbangan: Handler = (s, p) => ok(removeById(s.contribution, Number(p.p_contribution_id)));

// The board checks typeof === 'number' on all four totals, so they must stay numbers.
const urus_rsvp: Handler = (s) => {
  const rows = newestFirst(s.rsvp);
  const malam = rows.filter((r) => r.bermalam === true);
  const pax = (list: RsvpRow[]) => list.reduce((t, r) => t + r.pax, 0);
  return ok({
    senarai: rows.map((r) => ({ id: r.id, nama: r.nama, pax: r.pax, bermalam: r.bermalam, pada: r.created_at })),
    jumlah: { rsvp: rows.length, pax: pax(rows), bermalam_orang: pax(malam), bermalam_bilangan: malam.length },
  });
};

const urus_padam_rsvp: Handler = (s, p) => ok(removeById(s.rsvp, String(p.p_rsvp_id)));

const urus_doa: Handler = (s) =>
  ok({
    senarai: newestFirst(s.doa).map((d) => ({ id: d.id, nama: d.nama, mesej: d.mesej, pada: d.created_at })),
    jumlah: s.doa.length,
  });

const urus_padam_doa: Handler = (s, p) => ok(removeById(s.doa, Number(p.p_doa_id)));

// Unlike the guest reads, the board also sees inactive rows.
const urus_senarai_kandungan: Handler = (s) =>
  ok({
    hadiah: byUrutan(s.gift_item).map((g) => ({ ...g, ada_tempahan: s.reservation.some((r) => r.gift_item_id === g.id) })),
    tabung: byUrutan(s.fund_goal).map((f) => ({ ...f, ada_sumbangan: s.contribution.some((c) => c.goal_id === f.id) })),
  });

const urus_simpan_hadiah: Handler = (s, p) => {
  const nama = clip(p.p_nama, 120);
  if (nama === '') return fail('nama_diperlukan');
  const pautan = semakPautan(p.p_pautan);
  const gambar_url = semakPautan(p.p_gambar_url);
  if (pautan === null || gambar_url === null) return fail('pautan_tidak_sah');
  const nota = clip(p.p_nota, 300);

  if (p.p_id === null || p.p_id === undefined) {
    const id = nextId(s.gift_item);
    const urutan = Math.max(0, ...s.gift_item.map((g) => g.urutan)) + 1;
    s.gift_item.push({ id, nama, pautan, gambar_url, nota, aktif: p.p_aktif ?? true, urutan });
    return ok(id);
  }
  const row = s.gift_item.find((g) => g.id === Number(p.p_id));
  if (!row) return fail('hadiah_tiada');
  Object.assign(row, { nama, pautan, gambar_url, nota, aktif: p.p_aktif ?? row.aktif });
  return ok(row.id);
};

const urus_simpan_tabung: Handler = (s, p) => {
  const nama = clip(p.p_nama, 120);
  if (nama === '') return fail('nama_diperlukan');
  const sasaran = p.p_sasaran === null || p.p_sasaran === undefined ? NaN : Number(p.p_sasaran);
  if (!(sasaran >= 0.01 && sasaran <= 1_000_000)) return fail('sasaran_tidak_sah');
  const emoji = clip(p.p_emoji, 8);

  if (p.p_id === null || p.p_id === undefined) {
    const id = nextId(s.fund_goal);
    const urutan = Math.max(0, ...s.fund_goal.map((f) => f.urutan)) + 1;
    s.fund_goal.push({ id, nama, sasaran, emoji: emoji || '🎯', aktif: p.p_aktif ?? true, urutan });
    return ok(id);
  }
  const row = s.fund_goal.find((f) => f.id === Number(p.p_id));
  if (!row) return fail('tabung_tiada');
  Object.assign(row, { nama, sasaran, emoji: emoji || row.emoji, aktif: p.p_aktif ?? row.aktif });
  return ok(row.id);
};

Object.assign(RPC, {
  urus_overview, urus_batal_tempahan, urus_padam_sumbangan, urus_rsvp, urus_padam_rsvp,
  urus_doa, urus_padam_doa, urus_senarai_kandungan, urus_simpan_hadiah, urus_simpan_tabung,
});
for (const fn of ['urus_batal_tempahan', 'urus_padam_sumbangan', 'urus_padam_rsvp',
  'urus_padam_doa', 'urus_simpan_hadiah', 'urus_simpan_tabung']) {
  WRITES.add(fn);
}
