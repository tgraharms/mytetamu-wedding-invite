#!/usr/bin/env node
/**
 * Regenerates the favicon set in public/ from the sunflower source art.
 * Companion to scripts/guest-assets.mjs and scripts/premium-assets.mjs.
 *
 * Run by hand and commit the output. Deliberately NOT wired into
 * `npm run build` — the source art is gitignored and only exists on the
 * owner's machine, so a Vercel deploy must never depend on it.
 *
 * Outputs, all with stable names because browsers and iOS look them up by
 * convention rather than from a manifest:
 *
 *   favicon.ico           16/32/48 PNGs in one container, for the bare
 *                         /favicon.ico request browsers still make.
 *   favicon-{16,32,96}    the sizes actually referenced from <head>.
 *   apple-touch-icon.png  180x180, iOS home screen.
 *
 * Two deliberate choices worth keeping if this is ever re-run:
 *
 * 1. TRIM, THEN SQUARE. The source is vector art on a transparent canvas with
 *    uneven margins — the bloom is wider than it is tall and sits slightly off
 *    centre. Measuring the drawn area and padding it back to a square puts the
 *    flower dead centre at every size, instead of trusting hand-written crop
 *    numbers that break the moment the artwork is re-exported.
 *
 * 2. OPTICAL SIZING. Smaller icons get more saturation and contrast, because
 *    downsampling flattens both. Larger icons stay close to the original.
 *    The current art is already bold and saturated, so the grades are gentle.
 */
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

/** Shell cream, kept in step with `--dc-shell` in src/styles/global.css. */
const CREAM = '#f7f3ec';

/**
 * Source art is gitignored; check its tidy home first, then where it landed.
 * The PNG is preferred over the SVG because it carries a real alpha channel,
 * which is what lets the browser icons keep a transparent background.
 */
const CANDIDATES = [
  path.join(ROOT, 'TEMP ASSETS', 'Sunflower.png'),
  path.join(ROOT, 'Sunflower.png'),
  path.join(ROOT, 'TEMP ASSETS', 'Sunflower.svg'),
  path.join(ROOT, 'Sunflower.svg'),
];
const SRC = CANDIDATES.find((p) => existsSync(p));

if (!SRC) {
  console.error('Source art not found. Looked for:');
  for (const p of CANDIDATES) console.error('  ' + path.relative(ROOT, p));
  console.error('\nNothing was written. The committed icons in public/ are unchanged.');
  process.exit(1);
}

/** Working resolution for the vector render. Everything downsamples from here. */
const RASTER = 1024;

/** Breathing room around the bloom, as a fraction of the squared art. */
const MARGIN = 0.04;

/**
 * size -> saturation. See OPTICAL SIZING above.
 *
 * Saturation only, deliberately: the contrast pass this used to do went
 * through sharp's linear(), which applies to EVERY band including alpha and
 * would quietly turn the transparent padding semi-opaque — the exact thing
 * the transparent background exists to avoid. modulate() leaves alpha alone.
 */
const GRADE = { 16: 1.18, 32: 1.12, 48: 1.08, 96: 1.04 };

/**
 * The bloom, trimmed of its empty margin and padded back out to a centred
 * square. The padding is fully TRANSPARENT, so the browser-tab icons sit on
 * whatever colour the browser's chrome happens to be instead of carrying a
 * cream tile around with them. Rendered once and reused, because rasterising
 * the source is by far the slowest step here.
 */
async function squaredArt() {
  const art = await sharp(SRC, { density: (72 * RASTER) / 810 })
    .resize(RASTER, RASTER, { fit: 'inside' })
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  const side = Math.round(Math.max(art.info.width, art.info.height) * (1 + MARGIN * 2));
  return sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: art.data,
        top: Math.round((side - art.info.height) / 2),
        left: Math.round((side - art.info.width) / 2),
      },
    ])
    .png()
    .toBuffer();
}

const ART = await squaredArt();

function graded(saturation) {
  return sharp(ART).modulate({ saturation });
}

/** A transparent-background PNG at the given size. */
async function icon(size) {
  return graded(GRADE[size])
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Packs PNGs into an .ico. Since Vista the format accepts whole PNG blobs, so
 * this is just a 6-byte header, one 16-byte directory entry each, then the
 * blobs — no bitmap re-encoding needed.
 */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0); // 0 would mean 256
    e.writeUInt8(size, 1);
    e.writeUInt8(0, 2); // palette size, 0 for truecolour
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

console.log('source: ' + path.relative(ROOT, SRC) + '\n');

// The sizes referenced from <head>.
for (const size of [16, 32, 96]) {
  const data = await icon(size);
  await writeFile(path.join(PUBLIC, `favicon-${size}x${size}.png`), data);
  console.log(`  favicon-${size}x${size}.png`.padEnd(28) + kb(data.length));
}

// 48 is only ever an .ico member, so it is built in memory and never written
// as a standalone file — nothing in <head> would reference it.
const members = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await icon(size) })),
);
const icoData = ico(members);
await writeFile(path.join(PUBLIC, 'favicon.ico'), icoData);
console.log('  favicon.ico'.padEnd(28) + kb(icoData.length) + '  (16, 32, 48)');

// iOS applies its own corner mask, so this one stays square and fully opaque.
// Pre-rounding it would leave cream corners showing inside Apple's rounding.
// The padding gives that mask margin to bite into instead of petals.
//
// This is the ONE icon that keeps the cream tile rather than a transparent
// background: iOS composites a transparent home-screen icon onto BLACK, which
// would put the bloom on a black square on the guest's home screen.
const APPLE = 180;
const pad = Math.round(APPLE * 0.07);
const inner = await graded(1.12)
  .resize(APPLE - pad * 2, APPLE - pad * 2, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();
const appleData = await sharp({
  create: { width: APPLE, height: APPLE, channels: 3, background: CREAM },
})
  .composite([{ input: inner, top: pad, left: pad }])
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(path.join(PUBLIC, 'apple-touch-icon.png'), appleData);
console.log('  apple-touch-icon.png'.padEnd(28) + kb(appleData.length));

console.log('\nDone. Commit the output in public/.');
