#!/usr/bin/env node
/**
 * Regenerates guest-page imagery: public/bg/ and the AVIF siblings in
 * public/places/. Companion to scripts/premium-assets.mjs, which does the
 * same job for /jemputan.
 *
 * Run by hand and commit the output. Deliberately NOT wired into
 * `npm run build` — a Vercel deploy must never depend on source art that
 * only exists on the owner's machine.
 *
 * Two output shapes, for two different caching stories:
 *
 *   public/bg/     content-hashed filenames, referenced only from code, so
 *                  they can be immutable-cached for a year.
 *   public/places/ stable basenames, because those paths are stored in the
 *                  Supabase `aktiviti.imej` column. Renaming them would mean
 *                  a data migration on every re-export, so they keep their
 *                  names and a 30-day TTL instead.
 *   public/stays/  same deal for the penginapan cards, except the paths live
 *                  in src/content/site.ts rather than the database.
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BG_OUT = path.join(ROOT, 'public', 'bg');
const PLACES = path.join(ROOT, 'public', 'places');
const STAYS = path.join(ROOT, 'public', 'stays');

const AVIF_QUALITY = 48;

/** Lebar eksport gambar kad karusel; slot CSS 288px, jadi ini melindungi DPR 2. */
const LEBAR_KARUSEL = 640;

/**
 * Backgrounds, in the order they appear down the page.
 *
 * `source` is the highest-resolution original available. Three of these are
 * 1536w originals still sitting in the repo root that were downscaled to
 * 1080w when first shipped — re-exporting from them at 1440w comes out both
 * sharper AND smaller than the JPEG in production today.
 *
 * `width` is capped at 1440: the invite column is 480 CSS px and the densest
 * phones are DPR 3. Going wider buys nothing any screen can show.
 *
 * hero-bg's source is only 704w, so it stays 704w. Upscaling costs bytes and
 * invents no detail; making the hero genuinely crisp needs new art, which is
 * a creative job and out of scope here.
 */
const BACKGROUNDS = [
  { name: 'hero-bg',       source: 'PictureB-Edited.png',        width: 704 },
  { name: 'bg-butiran',    source: 'Butiran_Majlis.png',         width: 1440 },
  { name: 'bg-rsvp',       source: 'Sahkan_Kehadiran.jpg',       width: 1440 },
  { name: 'bg-lokasi',     source: 'Cara_Ke_Sana.JPG',           width: 768 },
  { name: 'bg-aktiviti',   source: 'Sementara_di_Pahang .png',   width: 1440 },
  { name: 'bg-penutup',    source: 'Penutup.png',                width: 768 },
  { name: 'bg-penginapan', source: 'Tempat_Penginapan.png',      width: 768 },
];

const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);
const kb = (n) => (n / 1024).toFixed(0);

mkdirSync(BG_OUT, { recursive: true });

const manifest = {};

for (const bg of BACKGROUNDS) {
  const src = path.join(ROOT, bg.source);
  if (!existsSync(src)) {
    console.error(`MISSING source for ${bg.name}: ${bg.source}`);
    process.exitCode = 1;
    continue;
  }

  const base = sharp(src).resize({ width: bg.width, withoutEnlargement: true });
  const avif = await base.clone().avif({ quality: AVIF_QUALITY }).toBuffer();
  // The JPEG is the fallback for Safari older than 16.4. Same pixels, so a
  // phone that takes this branch sees exactly what an AVIF phone sees.
  const jpg = await base.clone().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const meta = await sharp(avif).metadata();

  const h = hash8(avif);
  const avifName = `${bg.name}-${h}.avif`;
  const jpgName = `${bg.name}-${h}.jpg`;
  writeFileSync(path.join(BG_OUT, avifName), avif);
  writeFileSync(path.join(BG_OUT, jpgName), jpg);

  manifest[bg.name] = {
    avif: `/bg/${avifName}`,
    jpg: `/bg/${jpgName}`,
    width: meta.width,
    height: meta.height,
  };
  console.log(`${bg.name.padEnd(14)} ${String(meta.width).padStart(4)}w  avif ${kb(avif.length).padStart(4)} KB  jpg ${kb(jpg.length).padStart(4)} KB`);
}

// Manifest ditulis HANYA bila setiap latar berjaya dieksport. Seni sumbernya
// gitignored dan hidup di mesin pemilik sahaja, jadi menjalankan skrip ini di
// tempat lain akan menghasilkan manifest kosong — dan manifest kosong bermakna
// SETIAP latar seksyen hilang dari laman. Lebih baik biarkan fail lama begitu
// sahaja daripada menulis ganti sesuatu yang meruntuhkan halaman.
if (Object.keys(manifest).length === BACKGROUNDS.length) {
  writeFileSync(path.join(BG_OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} else {
  console.error(
    `\nmanifest.json TIDAK ditulis: ${Object.keys(manifest).length}/${BACKGROUNDS.length} latar sahaja berjaya.` +
      '\nFail sedia ada dibiarkan tidak berubah.',
  );
}

// ── carousel photos ──────────────────────────────────────────────────────
// Displayed in a 288x144 CSS slot, so 640w covers DPR 2 with a little to
// spare and is indistinguishable at DPR 3 behind object-cover. These are all
// lazy, so the extra bytes land in the deferred bucket, not first paint.
//
// Two folders, same treatment and same stable-basename contract:
//   places/ — aktiviti, paths stored in Supabase
//   stays/  — penginapan, paths stored in src/content/site.ts
//
// `tulisSemulaJpeg` hanya untuk stays/: gambar di sana datang terus daripada
// hasil carian pada apa-apa saiz antara 225px dan 1200px lebar, jadi JPEG
// sandarannya perlu dikecilkan sekali. Gambar dalam places/ sudah dikurasi
// pada 640w — memampatkannya semula setiap kali skrip ini berjalan hanya
// menurunkan kualitinya sedikit demi sedikit tanpa memberi apa-apa.
for (const { dir, tulisSemulaJpeg } of [
  { dir: PLACES, tulisSemulaJpeg: false },
  { dir: STAYS, tulisSemulaJpeg: true },
]) {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.jpg')) : [];
  if (files.length === 0) continue;
  console.log('');
  let before = 0;
  let after = 0;
  for (const file of files) {
    const src = path.join(dir, file);
    const asalSaiz = statSync(src).size;
    const asalLebar = (await sharp(src).metadata()).width ?? 0;
    const kecil = sharp(src).resize({ width: LEBAR_KARUSEL, withoutEnlargement: true });
    const avif = await kecil.clone().avif({ quality: 50 }).toBuffer();
    writeFileSync(path.join(dir, file.replace(/\.jpg$/, '.avif')), avif);

    // Syaratnya LEBAR SUMBER, bukan saiz fail. Memampatkan semula JPEG yang
    // sudah betul lebarnya hampir selalu menghasilkan fail yang sedikit lebih
    // kecil, jadi syarat "kalau lebih kecil, tulis" akan menulis ganti pada
    // SETIAP larian dan menurunkan kualitinya sedikit demi sedikit. Lebih
    // teruk lagi: sebaik sahaja fail di cakera mengecil, withoutEnlargement
    // menghalangnya daripada dibesarkan semula, jadi menaikkan sasaran lebar
    // kemudian tidak akan berkesan langsung. Dengan syarat ini, larian kedua
    // dan seterusnya tidak menyentuh apa-apa.
    let jpgSaiz = asalSaiz;
    if (tulisSemulaJpeg && asalLebar > LEBAR_KARUSEL) {
      const jpg = await kecil.clone().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      writeFileSync(src, jpg);
      jpgSaiz = jpg.length;
    }

    before += asalSaiz;
    after += avif.length;
    console.log(`${file.padEnd(28)} ${kb(asalSaiz).padStart(4)} KB -> avif ${kb(avif.length).padStart(3)} KB, jpg ${kb(jpgSaiz).padStart(3)} KB`);
  }
  console.log(`${path.basename(dir)} total: ${kb(before)} KB -> ${kb(after)} KB (avif)`);
}
