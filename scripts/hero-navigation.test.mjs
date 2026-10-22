import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/Hero.astro', import.meta.url), 'utf8');
const script = stripTypeScriptTypes(source.match(/<script>([\s\S]*?)<\/script>/)[1]);

// Execute the real countdown controller with a controlled clock and DOM boundary.
function openHero(iso) {
  let now = Date.parse(iso);
  let interval;
  const fields = Object.fromEntries(['days', 'hours', 'mins', 'secs'].map(key => [key, { textContent: '' }]));
  const hero = { dataset: { navigationFrom: '2026-09-18T00:00:00+08:00' } };
  const countdown = {
    dataset: { target: '2026-09-19T19:00:00+08:00' },
    querySelector: selector => fields[selector.match(/"(\w+)"/)[1]],
  };
  const listeners = {};
  const document = {
    hidden: false,
    getElementById: id => ({ hero, countdown })[id],
    addEventListener: (name, callback) => { listeners[name] = callback; },
  };
  class Clock extends Date { static now() { return now; } }
  runInNewContext(script, {
    document, Date: Clock,
    window: { setInterval: callback => { interval = callback; return 1; } },
    clearInterval: () => { interval = undefined; },
  });
  return {
    hero,
    values: () => Object.values(fields).map(field => field.textContent),
    advance: iso => { now = Date.parse(iso); interval?.(); },
    visibility: hidden => { document.hidden = hidden; listeners.visibilitychange(); },
  };
}

test('old hero stays until midnight Malaysia time; navigation appears at the boundary', () => {
  const page = openHero('2026-09-17T15:59:59Z');
  assert.equal(page.hero.dataset.navigation, 'false');
  assert.deepEqual(page.values(), ['01', '19', '00', '01']);
  page.advance('2026-09-17T16:00:00Z');
  assert.equal(page.hero.dataset.navigation, 'true');
  assert.deepEqual(page.values(), ['01', '19', '00', '00']);
});

test('Friday arrival opens navigation immediately and seconds keep updating', () => {
  const page = openHero('2026-09-18T11:00:00+08:00');
  assert.equal(page.hero.dataset.navigation, 'true');
  assert.deepEqual(page.values(), ['01', '08', '00', '00']);
  page.advance('2026-09-18T11:00:01+08:00');
  assert.deepEqual(page.values(), ['01', '07', '59', '59']);
});

test('returning from a background tab refreshes the Friday layout', () => {
  const page = openHero('2026-09-17T23:50:00+08:00');
  page.visibility(true);
  page.advance('2026-09-18T00:10:00+08:00');
  page.visibility(false);
  assert.equal(page.hero.dataset.navigation, 'true');
  assert.deepEqual(page.values(), ['01', '18', '50', '00']);
});

test('countdown stops at zero after the event starts and navigation remains available', () => {
  const page = openHero('2026-09-19T19:00:00+08:00');
  assert.deepEqual(page.values(), ['00', '00', '00', '00']);
  page.advance('2026-09-20T08:00:00+08:00');
  assert.equal(page.hero.dataset.navigation, 'true');
  assert.deepEqual(page.values(), ['00', '00', '00', '00']);
});
