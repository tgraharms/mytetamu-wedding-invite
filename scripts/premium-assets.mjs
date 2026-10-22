#!/usr/bin/env node
/**
 * Regenerates every derivative in public/premium/ from local source art.
 *
 * Two source locations:
 *   - `TEMP ASSETS/` (gitignored, repo-local) — the line-art/watercolour
 *     layers. These are REQUIRED: the run fails (non-zero exit) if one of
 *     them is missing, because they have no other home.
 *   - `~/Downloads` — the hero/cover photography and the flipped bouquets.
 *     These are OPTIONAL: if a source isn't there, the mapping is skipped
 *     and the existing public/premium/ file is left untouched. Nothing
 *     about a missing Downloads file should fail the whole run — it's
 *     someone's local export folder, not a repo artifact.
 *
 * Orientation ops (flip = vertical mirror, flop = horizontal mirror) are
 * baked into the file, never left to CSS. GSAP drives `transform` on these
 * elements at runtime for parallax/scroll effects, and a runtime transform
 * would silently overwrite a CSS `scaleX(-1)` / `scaleY(-1)` — so the
 * mirroring has to happen once, here, at export time.
 *
 * Usage:
 *   node scripts/premium-assets.mjs
 *   node scripts/premium-assets.mjs --deco-avif-quality=32   # re-tune deco AVIF quality
 */

import sharp from 'sharp';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEMP_ASSETS_DIR = path.join(ROOT, 'TEMP ASSETS');
const DOWNLOADS_DIR = path.join(homedir(), 'Downloads');
const OUT_DIR = path.join(ROOT, 'public', 'premium');

// ── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? Number(hit.slice(prefix.length)) : fallback;
}
const decoAvifQuality = flagValue('deco-avif-quality', 38);
const decoWebpQuality = flagValue('deco-webp-quality', 66);
const heroAvifQuality = flagValue('hero-avif-quality', 50);
const heroWebpQuality = flagValue('hero-webp-quality', 76);

// Decoration is never the subject of a frame — it can take a much harder
// compression hit than the hero art without anyone noticing.
const HERO_FORMATS = [
  ['avif', { quality: heroAvifQuality }],
  ['webp', { quality: heroWebpQuality }],
]; // cover-top, hero
// AVIF only: the *-960 candidates are srcset entries consumed alongside an
// AVIF <source> only (see jemputan.astro) — nothing wires up a WebP <source>
// for them, so generating one would just be 150 KB of dead weight per file.
const HERO_AVIF_ONLY_FORMATS = [['avif', { quality: heroAvifQuality }]]; // cover-top-960, hero-960
const DECO_FORMATS = [
  ['avif', { quality: decoAvifQuality }],
  ['webp', { quality: decoWebpQuality }],
]; // everything else

mkdirSync(OUT_DIR, { recursive: true });

let hadMissingRequiredSource = false;

/**
 * @param {object} task
 * @param {string} task.src          absolute path to the source file
 * @param {string} task.out          output basename (no extension), under public/premium/
 * @param {string[]} [task.ops]      'flip' (vertical mirror) and/or 'flop' (horizontal mirror)
 * @param {number} task.width
 * @param {number} task.height
 * @param {'cover'|'fill'|'inside'|'outside'|'contain'} [task.fit]
 * @param {Array} task.formats       [format, options][]
 * @param {boolean} [task.required]  fail the run if the source is missing
 */
async function runTask(task) {
  const { src, out, ops = [], width, height, fit = 'cover', formats, required = false } = task;

  if (!existsSync(src)) {
    if (required) {
      console.error(`[MISSING] ${out}: required source not found — ${src}`);
      hadMissingRequiredSource = true;
    } else {
      console.log(`[SKIP]    ${out}: optional source not found, leaving existing file untouched — ${src}`);
    }
    return;
  }

  let pipeline = sharp(src);
  if (ops.includes('flip')) pipeline = pipeline.flip();
  if (ops.includes('flop')) pipeline = pipeline.flop();
  pipeline = pipeline.resize(width, height, { fit });

  for (const [format, opts] of formats) {
    const outPath = path.join(OUT_DIR, `${out}.${format}`);
    await pipeline.clone()[format](opts).toFile(outPath);
    const bytes = statSync(outPath).size;
    console.log(`${out}.${format}\t${bytes} bytes`);
  }
}

// ── Required: TEMP ASSETS/ (line-art + watercolour layers) ────────────────
const requiredTasks = [
  { src: path.join(TEMP_ASSETS_DIR, 'CornerA.png'), out: 'corner-tl', ops: ['flip', 'flop'], width: 720, height: 720, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'CornerA.png'), out: 'corner-br', ops: [], width: 720, height: 720, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'TLflowerA.png'), out: 'tl-a', ops: [], width: 716, height: 906, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'TLflowerB.png'), out: 'tl-b', ops: [], width: 668, height: 621, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'BRflowerA.png'), out: 'br-a', ops: [], width: 900, height: 952, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'BRflowerB.png'), out: 'br-b', ops: [], width: 900, height: 550, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'MFflowerA.png'), out: 'mf-a', ops: [], width: 768, height: 900, formats: DECO_FORMATS, required: true },
  { src: path.join(TEMP_ASSETS_DIR, 'BLflowerA.png'), out: 'bl-a', ops: [], width: 900, height: 915, formats: DECO_FORMATS, required: true },
];

// ── Optional: ~/Downloads (hero photography + flipped bouquets) ───────────
const optionalTasks = [
  { src: path.join(DOWNLOADS_DIR, 'Zoom_out_Expand_image_2K_202607302358.jpg'), out: 'cover-top', ops: [], width: 1440, height: 1920, fit: 'cover', formats: HERO_FORMATS, required: false },
  { src: path.join(DOWNLOADS_DIR, 'Untitled design-2.png'), out: 'hero', ops: [], width: 1440, height: 1920, fit: 'cover', formats: HERO_FORMATS, required: false },
  { src: path.join(DOWNLOADS_DIR, 'Untitled design-3.png'), out: 'bouquet-left', ops: ['flip'], width: 666, height: 860, formats: DECO_FORMATS, required: false },
  { src: path.join(DOWNLOADS_DIR, 'Untitled design-4.png'), out: 'bouquet-right', ops: ['flip'], width: 666, height: 860, formats: DECO_FORMATS, required: false },
  // 960w variants of the two full-bleed layers, for DPR-2 phones: a DPR-3
  // phone needs the 1440w file, but a DPR-2 phone decoding the same 1440w
  // asset pays for pixels its screen physically cannot show. Half width.
  { src: path.join(DOWNLOADS_DIR, 'Zoom_out_Expand_image_2K_202607302358.jpg'), out: 'cover-top-960', ops: [], width: 960, height: 1280, fit: 'cover', formats: HERO_AVIF_ONLY_FORMATS, required: false },
  { src: path.join(DOWNLOADS_DIR, 'Untitled design-2.png'), out: 'hero-960', ops: [], width: 960, height: 1280, fit: 'cover', formats: HERO_AVIF_ONLY_FORMATS, required: false },
];

// ── Explicitly skipped: filigree-left / filigree-right ─────────────────────
// The brief's own mapping for these is self-contradictory (it points at
// "Untitled design-3.png", which is already the bouquet-left source — a
// flower photograph, not corner filigree) and names a "Personal Project
// ASSETS" folder that does not exist on this machine. A prior pass shipped
// the wrong image by guessing a source from matching dimensions; per the
// brief's own instruction, an unconfident guess here is worse than no
// change. Leaving public/premium/filigree-left.* and filigree-right.*
// exactly as they are.
function reportSkippedFiligree() {
  for (const out of ['filigree-left', 'filigree-right']) {
    console.log(`[SKIP]    ${out}: source cannot be confidently identified (see comment in this script) — leaving existing file untouched`);
  }
}

async function main() {
  console.log(`Reading required sources from: ${TEMP_ASSETS_DIR}`);
  for (const task of requiredTasks) await runTask(task);

  console.log(`\nReading optional sources from: ${DOWNLOADS_DIR}`);
  for (const task of optionalTasks) await runTask(task);

  console.log('');
  reportSkippedFiligree();

  if (hadMissingRequiredSource) {
    console.error('\nOne or more required TEMP ASSETS/ sources were missing. Failing.');
    process.exitCode = 1;
  } else {
    console.log('\nDone.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
