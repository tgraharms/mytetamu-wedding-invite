import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

// Run the real demoClient.ts in a VM, the way urus-doa.test.mjs runs
// urusDoa.ts. The file has no runtime imports, so only `export` has to go.
const source = readFileSync(new URL('../src/lib/demoClient.ts', import.meta.url), 'utf8')
  .replace(/^export /gm, '');
// Only getRandomValues, like a page served over plain http: no randomUUID.
const sandbox = {
  setTimeout,
  structuredClone,
  crypto: { getRandomValues: (a) => globalThis.crypto.getRandomValues(a) },
};
runInNewContext(
  stripTypeScriptTypes(source) +
    '\n;globalThis.createDemoClient = createDemoClient;' +
    '\nglobalThis.normalkanTelefon = typeof normalkanTelefon === "function" ? normalkanTelefon : undefined;',
  sandbox,
);
const { createDemoClient, normalkanTelefon } = sandbox;

// Objects built inside the VM come from another realm, so deepEqual fails
// on their prototypes alone. Compare plain copies.
const plain = (v) => JSON.parse(JSON.stringify(v));
const T = (day) => `2026-09-${String(day).padStart(2, '0')}T00:00:00.000Z`;
const KUNCI = { p_kunci: 'apa-apa' };

function seed() {
  return {
    version: 1,
    gift_item: [
      { id: 1, nama: 'Periuk nasi', pautan: 'https://example.com/1', gambar_url: '', nota: '', aktif: true, urutan: 2 },
      { id: 2, nama: 'Cerek', pautan: '', gambar_url: '', nota: '', aktif: true, urutan: 1 },
      { id: 3, nama: 'Lama', pautan: '', gambar_url: '', nota: '', aktif: false, urutan: 3 },
      { id: 4, nama: 'Tikar', pautan: '', gambar_url: '', nota: '', aktif: true, urutan: 4 },
    ],
    fund_goal: [{ id: 1, nama: 'Mesin basuh', sasaran: 850, emoji: '🧺', aktif: true, urutan: 1 }],
    aktiviti: [
      { id: 1, nama: 'Esplanade', kategori: 'Santai', jarak: '5 minit', pautan: '', nota: '', aktif: true, urutan: 2, imej: '', lencana: '' },
      { id: 2, nama: 'Kopi', kategori: 'Kopi', jarak: '5 minit', pautan: '', nota: '', aktif: true, urutan: 1, imej: '', lencana: '' },
    ],
    doa: [
      { id: 1, nama: 'Ali', mesej: 'Tahniah', created_at: T(1) },
      { id: 2, nama: 'Abu', mesej: 'Semoga bahagia', created_at: T(2) },
    ],
    rsvp: [{ id: 'r1', nama: 'Keluarga Ali', pax: 4, bermalam: true, created_at: T(1) }],
    guest: [{ id: 1, telefon: '447700900001', nama: 'Ali', created_at: T(1) }],
    reservation: [{ id: 1, gift_item_id: 1, guest_id: 1, created_at: T(1) }],
    contribution: [{ id: 1, goal_id: 1, guest_id: 1, amaun: 50, created_at: T(1) }],
  };
}

function setup({ stored = null, storage } = {}) {
  let saved = stored;
  let notes = 0;
  const c = createDemoClient({
    seed: seed(),
    passphrase: KUNCI.p_kunci,
    delayMs: 0,
    now: () => new Date(T(10)),
    uuid: () => 'uuid-new',
    storage: storage ?? { get: () => saved, set: (v) => { saved = v; } },
    notify: () => { notes++; },
  });
  return { c, saved: () => saved, notes: () => notes };
}

test('gift_item read hides inactive rows and follows the order', async () => {
  const { c } = setup();
  const { data, error } = await c.from('gift_item').select('*').order('urutan').abortSignal(AbortSignal.timeout(1000));
  assert.equal(error, null);
  assert.deepEqual(plain(data).map((g) => g.id), [2, 1, 4]);
});

test('doa read projects columns, sorts newest first and limits', async () => {
  const { c } = setup();
  const { data } = await c.from('doa').select('nama, mesej').order('created_at', { ascending: false }).limit(1);
  assert.deepEqual(plain(data), [{ nama: 'Abu', mesej: 'Semoga bahagia' }]);
});

test('builders work inside Promise.all, the way CadanganHadiah uses them', async () => {
  const { c } = setup();
  const [a, b] = await Promise.all([c.from('aktiviti').select('*').order('urutan'), c.from('doa').select('*')]);
  assert.deepEqual(plain(a.data).map((r) => r.id), [2, 1]);
  assert.equal(plain(b.data).length, 2);
});

test('tables closed by RLS on the real site stay closed', async () => {
  const { c } = setup();
  for (const table of ['rsvp', 'guest', 'reservation', 'contribution']) {
    const { data, error } = await c.from(table).select('*');
    assert.equal(data, null);
    assert.match(error.message, /not readable/);
  }
});

test('rsvp insert succeeds, persists and notifies', async () => {
  const { c, saved, notes } = setup();
  const res = await c.from('rsvp').insert({ nama: 'Keluarga Baru', pax: 3, bermalam: false });
  assert.deepEqual(plain(res), { data: null, error: null });
  assert.equal(notes(), 1);
  assert.deepEqual(JSON.parse(saved()).rsvp.at(-1), {
    id: 'uuid-new', nama: 'Keluarga Baru', pax: 3, bermalam: false, created_at: T(10),
  });
});

test('invalid inserts fail without saving or notifying', async () => {
  const { c, saved, notes } = setup();
  assert.ok((await c.from('rsvp').insert({ nama: ' ', pax: 2, bermalam: null })).error);
  assert.ok((await c.from('rsvp').insert({ nama: 'A', pax: 0, bermalam: null })).error);
  assert.ok((await c.from('doa').insert({ nama: 'A', mesej: 'x'.repeat(501) })).error);
  assert.ok((await c.from('gift_item').insert({ nama: 'X' })).error);
  assert.equal(notes(), 0);
  assert.equal(saved(), null);
});

test('a second page in the same tab sees the first page’s writes', async () => {
  const first = setup();
  await first.c.from('doa').insert({ nama: 'Siti', mesej: 'Selamat pengantin baru' });
  const second = setup({ stored: first.saved() });
  const { data } = await second.c.from('doa').select('nama').order('created_at', { ascending: false });
  assert.equal(plain(data)[0].nama, 'Siti');
});

test('corrupt or outdated saved state falls back to the seed', async () => {
  for (const stored of ['{not json', JSON.stringify({ ...seed(), version: 0, doa: [] })]) {
    const { c } = setup({ stored });
    assert.equal(plain((await c.from('doa').select('*')).data).length, 2);
  }
});

test('blocked storage still works for the current page', async () => {
  const blocked = () => { throw new Error('blocked'); };
  const { c, notes } = setup({ storage: { get: blocked, set: blocked } });
  assert.equal((await c.from('doa').insert({ nama: 'A', mesej: 'B' })).error, null);
  assert.equal(notes(), 1);
  assert.equal(plain((await c.from('doa').select('*')).data).length, 3);
});

test('an unknown rpc answers with an error instead of hanging', async () => {
  const { c } = setup();
  const { data, error } = await c.rpc('tiada_fungsi', {});
  assert.equal(data, null);
  assert.equal(error.message, 'demo: unknown rpc tiada_fungsi');
});

test('normalkanTelefon matches the SQL rules', () => {
  assert.equal(normalkanTelefon('03-0000 0000'), '60300000000');
  assert.equal(normalkanTelefon('+44 7700 900001'), '447700900001');
  assert.equal(normalkanTelefon('12345'), null);
  assert.equal(normalkanTelefon('1234567890123456'), null);
});

test('senarai_ditempah lists every reserved gift id', async () => {
  const { c } = setup();
  assert.deepEqual(plain((await c.rpc('senarai_ditempah')).data), [1]);
});

test('status_tetamu finds a guest in any phone format and never returns a name', async () => {
  const { c } = setup();
  const { data } = await c.rpc('status_tetamu', { p_telefon: '+44 7700 900001' });
  assert.deepEqual(plain(data), { nama: null, tempahan: [1], sumbangan: [{ goal_id: 1, amaun: 50 }] });
  const unknown = await c.rpc('status_tetamu', { p_telefon: '447700900999' });
  assert.deepEqual(plain(unknown.data), { nama: null, tempahan: [], sumbangan: [] });
  assert.equal((await c.rpc('status_tetamu', { p_telefon: '12' })).error.message, 'telefon_tidak_sah');
});

test('tempah_hadiah reserves for a new guest, saves and notifies', async () => {
  const { c, notes } = setup();
  const res = await c.rpc('tempah_hadiah', { p_telefon: '447700900005', p_nama: ' Siti ', p_gift_item_id: 2 });
  assert.deepEqual(plain(res), { data: null, error: null });
  assert.equal(notes(), 1);
  assert.deepEqual(plain((await c.rpc('senarai_ditempah')).data), [1, 2]);
  assert.deepEqual(plain((await c.rpc('status_tetamu', { p_telefon: '447700900005' })).data.tempahan), [2]);
});

test('tempah_hadiah refuses with the exact codes the page branches on', async () => {
  const { c, notes } = setup();
  const tempah = (p) => c.rpc('tempah_hadiah', { p_telefon: '447700900005', p_nama: 'Siti', p_gift_item_id: 2, ...p });
  assert.equal((await tempah({ p_gift_item_id: 3 })).error.message, 'hadiah_tiada'); // inactive
  assert.equal((await tempah({ p_gift_item_id: 99 })).error.message, 'hadiah_tiada'); // missing
  assert.equal((await tempah({ p_telefon: '12' })).error.message, 'telefon_tidak_sah');
  assert.equal((await tempah({ p_nama: '   ' })).error.message, 'nama_diperlukan');
  assert.equal((await tempah({ p_gift_item_id: 1 })).error.message, 'sudah_ditempah');
  assert.equal(notes(), 0);
});

test('a guest can hold two gifts at most, checked before sudah_ditempah', async () => {
  const { c } = setup();
  const tempah = (id) => c.rpc('tempah_hadiah', { p_telefon: '447700900001', p_nama: 'Ali', p_gift_item_id: id });
  assert.equal((await tempah(2)).error, null); // Ali now holds 1 and 2
  assert.equal((await tempah(4)).error.message, 'had_capai');
  assert.equal((await tempah(1)).error.message, 'had_capai');
});

test('batal_tempahan cancels once, then reports the gift already gone', async () => {
  const { c, notes } = setup();
  const batal = () => c.rpc('batal_tempahan', { p_telefon: '447700900001', p_gift_item_id: 1 });
  assert.equal((await batal()).data, true);
  assert.equal(notes(), 1);
  assert.equal((await batal()).data, false);
  assert.equal(notes(), 1);
  assert.deepEqual(plain((await c.rpc('senarai_ditempah')).data), []);
});

test('every urus_* call needs the demo passphrase', async () => {
  const { c } = setup();
  const fns = ['urus_overview', 'urus_rsvp', 'urus_doa', 'urus_senarai_kandungan', 'urus_padam_rsvp',
    'urus_padam_doa', 'urus_batal_tempahan', 'urus_padam_sumbangan', 'urus_simpan_hadiah', 'urus_simpan_tabung'];
  for (const fn of fns) {
    assert.equal((await c.rpc(fn, {})).error?.message, 'kunci_salah', fn);
    assert.equal((await c.rpc(fn, { p_kunci: '   ' })).error?.message, 'kunci_salah', fn);
    assert.equal((await c.rpc(fn, { p_kunci: 'wrong-password' })).error?.message, 'kunci_salah', fn);
  }
  assert.equal((await c.rpc('urus_overview', KUNCI)).error, null);
});

test('urus_overview joins reservations and contributions to names and phones', async () => {
  const { c } = setup();
  const { data } = await c.rpc('urus_overview', KUNCI);
  assert.deepEqual(plain(data), {
    tempahan: [{ id: 1, hadiah: 'Periuk nasi', hadiah_aktif: true, nama: 'Ali', telefon: '447700900001', pada: T(1) }],
    sumbangan: [{ id: 1, tabung: 'Mesin basuh', nama: 'Ali', telefon: '447700900001', amaun: 50, pada: T(1) }],
    jumlah: { tempahan: 1, sumbangan: 1, rm: 50 },
  });
});

test('a guest RSVP shows up on the board, newest first, with numeric totals', async () => {
  const { c } = setup();
  await c.from('rsvp').insert({ nama: 'Keluarga Baru', pax: 2, bermalam: false });
  const { data } = await c.rpc('urus_rsvp', KUNCI);
  assert.deepEqual(plain(data.senarai).map((r) => r.nama), ['Keluarga Baru', 'Keluarga Ali']);
  assert.deepEqual(plain(data.jumlah), { rsvp: 2, pax: 6, bermalam_orang: 4, bermalam_bilangan: 1 });
});

test('urus_padam_rsvp deletes by uuid string, once', async () => {
  const { c, notes } = setup();
  assert.equal((await c.rpc('urus_padam_rsvp', { ...KUNCI, p_rsvp_id: 'r1' })).data, true);
  assert.equal((await c.rpc('urus_padam_rsvp', { ...KUNCI, p_rsvp_id: 'r1' })).data, false);
  assert.equal(notes(), 1);
});

test('urus_doa lists wishes newest first, and urus_padam_doa removes one from the wall too', async () => {
  const { c } = setup();
  const { data } = await c.rpc('urus_doa', KUNCI);
  assert.deepEqual(plain(data.senarai).map((d) => d.id), [2, 1]);
  assert.equal(data.jumlah, 2);
  assert.equal((await c.rpc('urus_padam_doa', { ...KUNCI, p_doa_id: 2 })).data, true);
  assert.deepEqual(plain((await c.from('doa').select('nama')).data), [{ nama: 'Ali' }]);
});

test('urus_batal_tempahan and urus_padam_sumbangan remove by id', async () => {
  const { c } = setup();
  assert.equal((await c.rpc('urus_batal_tempahan', { ...KUNCI, p_reservation_id: 1 })).data, true);
  assert.equal((await c.rpc('urus_padam_sumbangan', { ...KUNCI, p_contribution_id: 1 })).data, true);
  const { data } = await c.rpc('urus_overview', KUNCI);
  assert.deepEqual(plain(data.jumlah), { tempahan: 0, sumbangan: 0, rm: 0 });
});

test('urus_senarai_kandungan includes inactive rows, ordered by urutan then id', async () => {
  const { c } = setup();
  const { data } = await c.rpc('urus_senarai_kandungan', KUNCI);
  assert.deepEqual(plain(data.hadiah).map((g) => [g.id, g.ada_tempahan]), [[2, false], [1, true], [3, false], [4, false]]);
  assert.deepEqual(plain(data.tabung).map((f) => [f.id, f.ada_sumbangan]), [[1, true]]);
});

test('urus_simpan_hadiah creates at the end of the list and updates in place', async () => {
  const { c, notes } = setup();
  const simpan = (p) => c.rpc('urus_simpan_hadiah', {
    ...KUNCI, p_id: null, p_nama: 'Baru', p_pautan: '', p_gambar_url: '', p_nota: '', p_aktif: true, ...p,
  });
  assert.equal((await simpan({ p_nama: `  ${'x'.repeat(130)}  ` })).data, 5);
  let { data } = await c.rpc('urus_senarai_kandungan', KUNCI);
  const created = plain(data.hadiah).find((g) => g.id === 5);
  assert.equal(created.urutan, 5);
  assert.equal(created.nama.length, 120);
  assert.equal((await simpan({ p_id: 2, p_nama: 'Cerek elektrik', p_aktif: false })).data, 2);
  ({ data } = await c.rpc('urus_senarai_kandungan', KUNCI));
  assert.deepEqual(plain(data.hadiah).find((g) => g.id === 2), {
    id: 2, nama: 'Cerek elektrik', pautan: '', gambar_url: '', nota: '', aktif: false, urutan: 1, ada_tempahan: false,
  });
  assert.equal(notes(), 2);
});

test('urus_simpan_hadiah refuses bad input with the codes the board maps', async () => {
  const { c, notes } = setup();
  const simpan = (p) => c.rpc('urus_simpan_hadiah', {
    ...KUNCI, p_id: null, p_nama: 'Baru', p_pautan: '', p_gambar_url: '', p_nota: '', p_aktif: true, ...p,
  });
  assert.equal((await simpan({ p_nama: ' ' })).error.message, 'nama_diperlukan');
  assert.equal((await simpan({ p_pautan: 'shopee.com.my' })).error.message, 'pautan_tidak_sah');
  assert.equal((await simpan({ p_gambar_url: 'ftp://x' })).error.message, 'pautan_tidak_sah');
  assert.equal((await simpan({ p_id: 99 })).error.message, 'hadiah_tiada');
  assert.equal(notes(), 0);
});

test('urus_simpan_tabung validates the target and treats the emoji like the SQL', async () => {
  const { c } = setup();
  const simpan = (p) => c.rpc('urus_simpan_tabung', {
    ...KUNCI, p_id: null, p_nama: 'Bulan madu', p_sasaran: 500, p_emoji: '', p_aktif: true, ...p,
  });
  assert.equal((await simpan({ p_sasaran: 0 })).error.message, 'sasaran_tidak_sah');
  assert.equal((await simpan({ p_sasaran: 1000001 })).error.message, 'sasaran_tidak_sah');
  assert.equal((await simpan({ p_sasaran: null })).error.message, 'sasaran_tidak_sah');
  assert.equal((await simpan({ p_id: 99 })).error.message, 'tabung_tiada');
  assert.equal((await simpan({})).data, 2);
  await simpan({ p_id: 1, p_nama: 'Mesin basuh', p_sasaran: 900, p_emoji: '' });
  const { data } = await c.rpc('urus_senarai_kandungan', KUNCI);
  assert.deepEqual(plain(data.tabung).map((f) => [f.id, f.emoji, f.sasaran]), [[1, '🧺', 900], [2, '🎯', 500]]);
});

test('text limits count code points, so emoji are never cut in half', async () => {
  const { c } = setup();
  const simpan = (p) => c.rpc('urus_simpan_tabung', { ...KUNCI, p_id: null, p_nama: 'Bulan madu', p_sasaran: 500, p_emoji: '', p_aktif: true, ...p });
  assert.equal((await simpan({ p_emoji: 'abc' + '🧺'.repeat(4) })).data, 2);
  assert.equal((await simpan({ p_emoji: 'abcdefgh🧺' })).data, 3);
  const { data } = await c.rpc('urus_senarai_kandungan', KUNCI);
  assert.deepEqual(plain(data.tabung).map((f) => f.emoji), ['🧺', 'abc🧺🧺🧺🧺', 'abcdefgh']);
});

test('without a uuid option, ids still work where crypto.randomUUID does not exist', async () => {
  let saved = null;
  const c = createDemoClient({
    seed: seed(),
    delayMs: 0,
    now: () => new Date(T(10)),
    storage: { get: () => saved, set: (v) => { saved = v; } },
    notify: () => {},
  });
  assert.equal(sandbox.crypto.randomUUID, undefined);
  const res = await c.from('rsvp').insert({ nama: 'Keluarga Baru', pax: 3, bermalam: false });
  assert.equal(res.error, null);
  assert.match(JSON.parse(saved).rsvp.at(-1).id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
