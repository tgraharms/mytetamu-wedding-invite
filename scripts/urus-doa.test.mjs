import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

// Jalankan modul panel sebenar dengan DOM mini dan RPC palsu. Import dibuang
// kerana modul ini cuma memerlukan `el` (dibekalkan di bawah) dan satu jenis.
const source = readFileSync(new URL('../src/lib/urusDoa.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^export /gm, '');
const script = stripTypeScriptTypes(source) + '\n;globalThis.pasangDoa = pasangDoa;';

function node(tag, className, text) {
  const n = {
    tag, className, textContent: text ?? '', children: [], attrs: {}, disabled: false, type: '', listeners: {},
    appendChild(c) { n.children.push(c); return c; },
    replaceChildren(...cs) { n.children = cs; },
    setAttribute(k, v) { n.attrs[k] = v; },
    addEventListener(name, cb) { n.listeners[name] = cb; },
    click() { n.listeners.click?.(); },
  };
  return n;
}
const teks = (n) => [n.textContent, ...n.children.map(teks)].join(' ');

function buka({ rpc, confirm = () => true }) {
  const root = node('div', '');
  const alerts = [];
  let ditolak = 0;
  const ctx = {
    el: node,
    window: { confirm, alert: (m) => alerts.push(m) },
    Date, Array, Object, Promise, Math, String, Number, console,
  };
  runInNewContext(script, ctx);
  const panel = ctx.pasangDoa({ root, panggil: rpc, kunci: () => 'k', kunciDitolak: () => { ditolak += 1; } });
  return { root, panel, alerts, ditolak: () => ditolak };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test('memuatkan senarai penuh dengan jumlah, nama, mesej dan butang padam', async () => {
  const data = { senarai: [
    { id: 7, nama: 'Ali', mesej: 'Selamat pengantin baru!\nSemoga bahagia.', pada: '2026-09-18T01:00:00Z' },
    { id: 8, nama: 'Siti', mesej: 'Tahniah', pada: '2026-09-17T01:00:00Z' },
  ], jumlah: 2 };
  const { root, panel } = buka({ rpc: async (fn) => { assert.equal(fn, 'urus_doa'); return { data, error: null }; } });
  await panel.muat();
  const t = teks(root);
  assert.match(t, /2 ucapan & doa diterima/);
  assert.match(t, /Ali/); assert.match(t, /Selamat pengantin baru!\nSemoga bahagia\./);
  assert.match(t, /Siti/); assert.match(t, /Tahniah/);
  const ul = root.children[1];
  assert.equal(ul.children.length, 2);
  const btn = ul.children[0].children[1];
  assert.equal(btn.textContent, 'Padam');
  assert.equal(btn.attrs['aria-label'], 'Padam doa daripada Ali');
});

test('senarai kosong menunjukkan mesej kosong', async () => {
  const { root, panel } = buka({ rpc: async () => ({ data: { senarai: [], jumlah: 0 }, error: null }) });
  await panel.muat();
  assert.match(teks(root), /Tiada doa lagi\./);
});

test('kunci_salah semasa muat mengosongkan panel dan memanggil kunciDitolak', async () => {
  const { root, panel, ditolak } = buka({ rpc: async () => ({ data: null, error: { message: 'kunci_salah' } }) });
  await panel.muat();
  assert.equal(root.children.length, 0);
  assert.equal(ditolak(), 1);
});

test('ralat lain memaparkan skrin gagal dengan butang cuba lagi', async () => {
  const { root, panel } = buka({ rpc: async () => ({ data: null, error: { message: 'timeout' } }) });
  await panel.muat();
  assert.match(teks(root), /tidak dapat dimuatkan/);
  assert.equal(root.children[1].textContent, 'Cuba lagi');
});

test('padam memanggil urus_padam_doa dengan id lalu memuat semula', async () => {
  const calls = [];
  let senarai = [{ id: 7, nama: 'Ali', mesej: 'Hai', pada: '2026-09-18T01:00:00Z' }];
  const rpc = async (fn, params) => {
    calls.push([fn, params]);
    if (fn === 'urus_padam_doa') { senarai = []; return { data: true, error: null }; }
    return { data: { senarai, jumlah: senarai.length }, error: null };
  };
  const { root, panel, alerts } = buka({ rpc });
  await panel.muat();
  root.children[1].children[0].children[1].click();
  await tick(); await tick();
  // JSON, bukan deepEqual: objek params lahir dalam realm vm, prototaipnya berbeza.
  assert.equal(JSON.stringify(calls[1]), JSON.stringify(['urus_padam_doa', { p_kunci: 'k', p_doa_id: 7 }]));
  assert.equal(calls[2][0], 'urus_doa');
  assert.match(teks(root), /Tiada doa lagi\./);
  assert.deepEqual(alerts, []);
});

test('padam dibatalkan oleh dialog sahkan tidak memanggil apa-apa', async () => {
  const calls = [];
  const rpc = async (fn) => { calls.push(fn); return { data: { senarai: [{ id: 1, nama: 'A', mesej: 'M', pada: '2026-09-18T01:00:00Z' }], jumlah: 1 }, error: null }; };
  const { root, panel } = buka({ rpc, confirm: () => false });
  await panel.muat();
  root.children[1].children[0].children[1].click();
  await tick();
  assert.deepEqual(calls, ['urus_doa']);
});

test('reset mengosongkan panel dan muat lama tidak mengisinya semula', async () => {
  let selesai;
  const rpc = () => new Promise((r) => { selesai = r; });
  const { root, panel } = buka({ rpc });
  const p = panel.muat();
  panel.reset();
  selesai({ data: { senarai: [], jumlah: 0 }, error: null });
  await p;
  assert.equal(root.children.length, 0);
});
