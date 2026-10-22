import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const raw = readFileSync(new URL('../src/content/demo/seed.ts', import.meta.url), 'utf8');
const sandbox = {};
runInNewContext(
  stripTypeScriptTypes(raw.replace(/^import type .*$/m, '').replace(/^export /gm, '')) +
    '\n;globalThis.demoSeed = demoSeed;',
  sandbox,
);
const seed = JSON.parse(JSON.stringify(sandbox.demoSeed));
const TABLES = ['gift_item', 'fund_goal', 'aktiviti', 'doa', 'rsvp', 'guest', 'reservation', 'contribution'];

test('every table is present with unique ids', () => {
  assert.ok(Number.isInteger(seed.version) && seed.version > 0);
  for (const t of TABLES) {
    assert.ok(Array.isArray(seed[t]) && seed[t].length > 0, t);
    assert.equal(new Set(seed[t].map((r) => r.id)).size, seed[t].length, `${t} ids`);
  }
});

test('links between rows point at rows that exist', () => {
  const gifts = new Map(seed.gift_item.map((g) => [g.id, g]));
  const guests = new Set(seed.guest.map((g) => g.id));
  const goals = new Set(seed.fund_goal.map((f) => f.id));
  for (const r of seed.reservation) {
    assert.ok(gifts.get(r.gift_item_id)?.aktif, `reservation ${r.id} gift`);
    assert.ok(guests.has(r.guest_id), `reservation ${r.id} guest`);
  }
  assert.equal(new Set(seed.reservation.map((r) => r.gift_item_id)).size, seed.reservation.length);
  for (const c of seed.contribution) {
    assert.ok(goals.has(c.goal_id) && guests.has(c.guest_id), `contribution ${c.id}`);
    assert.equal(typeof c.amaun, 'number');
  }
});

test('rows match what the pages and the board expect', () => {
  for (const r of seed.rsvp) {
    assert.equal(typeof r.id, 'string');
    assert.ok(Number.isInteger(r.pax) && r.pax >= 1);
    assert.ok(r.bermalam === true || r.bermalam === false || r.bermalam === null);
  }
  for (const d of seed.doa) {
    assert.ok(d.nama.length >= 1 && d.nama.length <= 100);
    assert.ok(d.mesej.length >= 1 && d.mesej.length <= 500);
  }
  for (const t of TABLES) {
    for (const row of seed[t]) {
      if ('created_at' in row) assert.ok(!Number.isNaN(Date.parse(row.created_at)), `${t} ${row.id} created_at`);
    }
  }
  for (const f of seed.fund_goal) assert.equal(typeof f.sasaran, 'number');
});

test('nothing personal: fiction-range phones only, no real numbers, no emails', () => {
  for (const g of seed.guest) assert.match(g.telefon, /^447700900\d{3}$/);
  const all = JSON.stringify(seed);
  // Shop links carry long product ids (a public number, not a person's), so
  // look for phone-length digit runs everywhere except inside a URL.
  const outsideUrls = all.replace(/https?:\/\/[^"\s]+/g, '');
  for (const run of outsideUrls.match(/\d{10,}/g) ?? []) assert.match(run, /^447700900\d{3}$/, 'long digit run');
  assert.doesNotMatch(all, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
});
