#!/usr/bin/env node
/**
 * Static byte budget for the guest-facing pages.
 *
 * Walks the built `dist/`, resolves every asset each page references, and
 * splits them into two buckets:
 *
 *   critical — fetched before or during first paint
 *   deferred — `loading="lazy"`, or fetched only after a user gesture
 *
 * The split is the whole point. Total page weight is a bad target; what hurts
 * a guest on a slow connection is how many bytes stand between them and the
 * first thing they can look at.
 *
 * Audio is counted as deferred ONLY when no script calls play() at load. That
 * is asserted separately in Step 4 of Task 2, because static analysis of
 * bundled JS is too brittle to gate a build on.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/** Pages to police, and their ceilings in KB. Tighten these as tasks land. */
const BUDGETS = {
  '/':          { critical:  420, deferred: 99999 },
  '/special':   { critical:  440, deferred: 99999 },
  '/jemputan':  { critical:  740, deferred: 99999 },
};

const kb = (bytes) => bytes / 1024;
const sizeOf = (rel) => {
  const f = path.join(DIST, rel.replace(/^\//, '').split('?')[0]);
  return existsSync(f) && statSync(f).isFile() ? statSync(f).size : 0;
};

/** Pull every `url(...)` target out of a CSS or inline-style string. */
function cssUrls(text) {
  return [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith('/'));
}

function collect(pageRoute) {
  const htmlPath = pageRoute === '/' ? 'index.html' : `${pageRoute.slice(1)}/index.html`;
  const full = path.join(DIST, htmlPath);
  if (!existsSync(full)) throw new Error(`missing build output: ${htmlPath}`);
  const html = readFileSync(full, 'utf8');

  const critical = new Map();
  const deferred = new Map();
  const add = (bucket, ref) => {
    const bytes = sizeOf(ref);
    if (bytes > 0) bucket.set(ref, bytes);
  };

  // The HTML document itself.
  critical.set(htmlPath, statSync(full).size);

  // Stylesheets, and every image they reference. Matched order-agnostically:
  // pull out the whole `<link>` tag first, then check for `rel="stylesheet"`
  // and pull `href` independently, so `<link href="..." rel="stylesheet">`
  // is caught exactly like the `rel` -before- `href` order Astro emits today.
  // A tag that only matches attribute-order-dependent regex would otherwise
  // drop its stylesheet AND every `url()` it references to 0 bytes, silently.
  for (const m of html.matchAll(/<link\b([^>]*)>/g)) {
    const attrs = m[1];
    if (!/\srel="stylesheet"/.test(attrs)) continue;
    const href = attrs.match(/\shref="([^"]+)"/);
    if (!href || !href[1].startsWith('/')) continue; // third-party (Google Fonts) — see Task 5
    add(critical, href[1]);
    const cssFile = path.join(DIST, href[1].replace(/^\//, ''));
    if (existsSync(cssFile)) for (const u of cssUrls(readFileSync(cssFile, 'utf8'))) add(critical, u);
  }

  // Inline <style> blocks and style="" attributes.
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) for (const u of cssUrls(m[1])) add(critical, u);
  for (const m of html.matchAll(/style="([^"]*)"/g)) for (const u of cssUrls(m[1])) add(critical, u);

  // Scripts.
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) if (m[1].startsWith('/')) add(critical, m[1]);
  // ...and anything those scripts statically import — TRANSITIVELY. A script's
  // import can itself import another module (e.g. liveList.js importing
  // supabase.js), so this walks a worklist/queue until no new modules turn up
  // rather than following just one hop. `seen` dedupes so a module already
  // queued is never re-processed, which also guards against import cycles
  // looping forever.
  const seen = new Set([...critical.keys()].filter((ref) => ref.endsWith('.js')));
  const queue = [...seen];
  while (queue.length) {
    const ref = queue.shift();
    const js = path.join(DIST, ref.replace(/^\//, ''));
    if (!existsSync(js)) continue;
    for (const m of readFileSync(js, 'utf8').matchAll(/from\s*["']\.\/([^"']+)["']/g)) {
      const imported = '/_astro/' + m[1];
      add(critical, imported);
      if (!seen.has(imported)) {
        seen.add(imported);
        queue.push(imported);
      }
    }
  }

  // <picture> first, as a UNIT. Two things go wrong if you scan <source> and
  // <img> independently:
  //
  //   1. `loading="lazy"` only ever appears on the <img>. A <source> read on
  //      its own always looks eager, so every lazy AVIF would be miscounted
  //      as critical — the exact opposite of the truth.
  //   2. A browser fetches ONE candidate, not all of them. Counting the AVIF
  //      and its JPEG fallback both would roughly double every image.
  //
  // So: laziness comes from the <img>, and the first <source srcset> is what
  // gets counted, since that is what a current browser actually picks.
  let rest = html;
  for (const block of html.match(/<picture\b[\s\S]*?<\/picture>/g) ?? []) {
    rest = rest.replace(block, '');
    const img = block.match(/<img\b([^>]*)>/);
    const lazy = img ? /loading="lazy"/.test(img[1]) : false;
    const bucket = lazy ? deferred : critical;
    const firstSource = block.match(/<source\b[^>]*\ssrcset="([^"]+)"/);
    const chosen = firstSource
      ? firstSource[1].split(',')[0].trim().split(/\s+/)[0]
      : img?.[1].match(/\ssrc="([^"]+)"/)?.[1];
    if (chosen?.startsWith('/')) add(bucket, chosen);
  }

  // Bare <img> outside any <picture>.
  for (const m of rest.matchAll(/<img\b([^>]*)>/g)) {
    const attrs = m[1];
    const bucket = /loading="lazy"/.test(attrs) ? deferred : critical;
    const src = attrs.match(/\ssrc="([^"]+)"/);
    if (src?.[1].startsWith('/')) add(bucket, src[1]);
  }

  // <audio> is deferred by definition — it must never be fetched at load.
  for (const m of html.matchAll(/<audio\b[^>]*\ssrc="([^"]+)"/g)) if (m[1].startsWith('/')) add(deferred, m[1]);

  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  return { critical, deferred, criticalKb: kb(sum(critical)), deferredKb: kb(sum(deferred)) };
}

let failed = false;
const verbose = process.argv.includes('--verbose');

for (const [route, budget] of Object.entries(BUDGETS)) {
  const r = collect(route);
  const over = r.criticalKb > budget.critical;
  if (over) failed = true;
  console.log(
    `${over ? 'FAIL' : 'ok  '}  ${route.padEnd(11)} critical ${r.criticalKb.toFixed(0).padStart(5)} KB ` +
      `(budget ${String(budget.critical).padStart(5)})   deferred ${r.deferredKb.toFixed(0).padStart(5)} KB`,
  );
  if (verbose) {
    for (const [ref, b] of [...r.critical].sort((a, x) => x[1] - a[1]))
      console.log(`         critical  ${kb(b).toFixed(1).padStart(7)} KB  ${ref}`);
    for (const [ref, b] of [...r.deferred].sort((a, x) => x[1] - a[1]))
      console.log(`         deferred  ${kb(b).toFixed(1).padStart(7)} KB  ${ref}`);
  }
}

process.exit(failed ? 1 : 0);
