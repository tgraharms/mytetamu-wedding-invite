/**
 * Asset manifest for the /lab/premium cinematic invite.
 *
 * Every visual layer the sequence needs is listed here exactly once. While
 * `src` is null the page draws a crude CSS placeholder in that layer's slot, so
 * the motion can be built and judged before any art exists. To drop real art
 * in, put the file in `public/premium/` and set `src` — nothing else changes.
 *
 * Four rules for anything produced for this list, in order of how badly they
 * break things if ignored:
 *
 *   1. No text baked into images. All copy is real DOM text from site.ts, so it
 *      stays crisp at any pixel density, editable without re-exporting, and
 *      readable by a screen reader.
 *   2. No shadows or perspective drawn in. These layers get transformed at
 *      runtime; a shadow painted at one angle is wrong at every other angle.
 *      Draw flat-on and let CSS add the depth.
 *   3. Transparency where the layer overlaps something (corners, garland).
 *      Full-bleed layers (hero, covers) do not need an alpha channel and
 *      compress better without one.
 *   4. Reuse over per-scene art. The corners and garland are placed and scaled
 *      per scene rather than composed into each one.
 *
 * Everything is served as AVIF with a WebP fallback: AVIF is roughly half the
 * bytes, WebP covers Safari older than 16.4.
 */

/**
 * The frame every layer is sized against.
 *
 * 1440 × 3120 is the ceiling: the invite column caps at 480 CSS px, times 3x for
 * the densest phone screens, at 1:2.17 — the tallest common phone aspect.
 *
 * Design all layers on ONE canvas this size and export each by hiding the
 * others. Sizing them separately is how pieces end up misaligned; on a shared
 * canvas the flap's apex and the seal line up by construction.
 *
 * Phone aspects run from 1:1.78 (iPhone SE) to 1:2.17, so a shorter phone crops
 * roughly 9% off the top and bottom of a full-height layer. Keep anything that
 * must always be visible inside SAFE_AREA.
 */
export const REFERENCE_FRAME = { w: 1440, h: 3120 } as const;
export const SAFE_AREA = { w: 1440, h: 2560 } as const;

export type AssetFormat = 'png-alpha' | 'svg' | 'tile';

export interface PremiumAsset {
  /** CSS custom property the stage exposes, e.g. `--px-cover-top`. */
  key: string;
  label: string;
  /** Path under public/. Null means the CSS placeholder is still in use. */
  src: string | null;
  /**
   * Optional WebP alongside an AVIF `src`. AVIF is roughly half the bytes but
   * only lands in Safari 16.4+; a guest on an older phone would otherwise get
   * a blank layer, which on the opening screen is fatal.
   */
  srcFallback?: string;
  format: AssetFormat;
  /** Export dimensions. Roughly 2x the largest size it renders at. */
  size: string;
  notes: string;
}

export const premiumAssets: readonly PremiumAsset[] = [
  {
    key: '--px-hero',
    label: 'Hero — aged paper revealed behind the covers',
    src: '/premium/hero.avif',
    srcFallback: '/premium/hero.webp',
    format: 'png-alpha',
    size: '1440 × 1920 supplied  (frame is 1440 × 3120)',
    notes:
      'Sits at the back, revealed as the covers part, and doubles as the paper bed under ' +
      'every scene. Supplied at 3:4 but rendered into a much taller box, so roughly 38% of ' +
      'its width is cropped — harmless here because it is a texture with no subject, but a ' +
      'composition at this ratio would lose its edges.',
  },
  {
    key: '--px-hero-960',
    label: 'Hero — 960w candidate (DPR-2 phones)',
    src: '/premium/hero-960.avif',
    format: 'png-alpha',
    size: '960 × 1280  (same 3:4 crop as --px-hero, quarter the pixels)',
    notes:
      'Responsive srcset candidate only — never referenced directly by a bare src. Same ' +
      'reasoning as --px-cover-top-960: halves the decoded footprint for the DPR-2 phones ' +
      'that cannot render the extra resolution anyway. No srcFallback: this candidate is ' +
      'only ever consumed inside an <img> alongside an AVIF <source> — there is no WebP ' +
      '<source> for it to feed (see jemputan.astro), so a WebP file here would be dead weight.',
  },
  {
    key: '--px-cover-top',
    label: 'Cover — top half (sunflower pattern)',
    src: '/premium/cover-top.avif',
    srcFallback: '/premium/cover-top.webp',
    format: 'png-alpha',
    size: '1440 × 1920  (3:4, plain rectangle)',
    notes:
      'A PLAIN RECTANGLE. Do not cut the V shape — CSS clips the silhouette, so the ' +
      'geometry can be retuned without re-exporting. Supplied landscape and upscaled ~1.6x ' +
      'to fill the portrait box; acceptable only because it is a repeating pattern. A ' +
      'portrait export at 1440 × 1920 would be visibly sharper.',
  },
  {
    key: '--px-cover-top-960',
    label: 'Cover — top half, 960w candidate (DPR-2 phones)',
    src: '/premium/cover-top-960.avif',
    format: 'png-alpha',
    size: '960 × 1280  (same 3:4 crop as --px-cover-top, quarter the pixels)',
    notes:
      'Responsive srcset candidate only — never referenced directly by a bare src. A DPR-3 ' +
      'phone still gets --px-cover-top at 1440w; a DPR-2 phone was decoding that same ' +
      '11.1 MB bitmap for a screen that can only ever show a quarter of those pixels. No ' +
      'srcFallback: no WebP <source> consumes it (see jemputan.astro), so a WebP file here ' +
      'would be dead weight.',
  },
  {
    key: '--px-cover-bottom',
    label: 'Cover — bottom half',
    src: null,
    format: 'png-alpha',
    size: '1440 × 1920  (3:4, plain rectangle)',
    notes:
      'Currently flat cream drawn in CSS, matching the draft — no art needed unless the ' +
      'bottom half should carry texture of its own. Anchored to its TOP edge (the seam).',
  },
  {
    key: '--px-filigree-left',
    label: 'Gold filigree — top left',
    src: '/premium/filigree-left.avif',
    srcFallback: '/premium/filigree-left.webp',
    format: 'png-alpha',
    size: '660 × 720',
    notes:
      'Mirrored from CornerA.png at build time, not with a CSS transform: GSAP drives ' +
      'transform on these elements for parallax and would overwrite a scaleX(-1). Any ' +
      'future orientation belongs in the file, not the stylesheet.',
  },
  {
    key: '--px-filigree-right',
    label: 'Gold filigree — top right',
    src: '/premium/filigree-right.avif',
    srcFallback: '/premium/filigree-right.webp',
    format: 'png-alpha',
    size: '660 × 720',
    notes:
      'CornerA.png as supplied — its two rules meet at the top right, so this orientation ' +
      'is the native one and the left corner is the mirrored copy.',
  },
  {
    key: '--px-bouquet-left',
    label: 'Sunflower bouquet — bottom left',
    src: '/premium/bouquet-left.avif',
    srcFallback: '/premium/bouquet-left.webp',
    format: 'png-alpha',
    size: '666 × 860',
    notes:
      'The top-corner bouquet flipped vertically at build time so the blooms sit at the ' +
      'bottom and the stems rise. If the inverted leaves ever read wrong, the fix is a ' +
      'purpose-drawn bottom bouquet rather than a CSS transform.',
  },
  {
    key: '--px-bouquet-right',
    label: 'Sunflower bouquet — bottom right',
    src: '/premium/bouquet-right.avif',
    srcFallback: '/premium/bouquet-right.webp',
    format: 'png-alpha',
    size: '666 × 860',
    notes: 'Mirror of the bottom-left bouquet, also flipped vertically at build time.',
  },
  {
    key: '--px-garland',
    label: 'Garland — scene footer (currently unused)',
    src: null,
    format: 'png-alpha',
    size: '1440 × 249  (5.8:1)',
    notes:
      'Superseded by the bottom corner bouquets. The file is still in public/premium/ if ' +
      'the full-width band is ever wanted back — set src to restore it.',
  },
  /* ── Scene 3, PRAYERS. Watercolour sunflowers framing the hexagon panel,
     top-left pair and bottom-right pair, per ReferenceB. ────────────── */
  {
    key: '--px-tl-a',
    label: 'Prayers — top-left sunflowers on stems',
    src: '/premium/tl-a.avif',
    srcFallback: '/premium/tl-a.webp',
    format: 'png-alpha',
    size: '716 × 906',
    notes: 'Tall pair on green stems. Sits highest in the top-left group.',
  },
  {
    key: '--px-tl-b',
    label: 'Prayers — top-left single bloom',
    src: '/premium/tl-b.avif',
    srcFallback: '/premium/tl-b.webp',
    format: 'png-alpha',
    size: '668 × 621',
    notes: 'One large open flower, overlapping the panel corner beneath the stems.',
  },
  {
    key: '--px-br-a',
    label: 'Prayers — bottom-right cluster',
    src: '/premium/br-a.avif',
    srcFallback: '/premium/br-a.webp',
    format: 'png-alpha',
    size: '900 × 952',
    notes: 'Diagonal cluster with foliage, anchoring the bottom-right corner.',
  },
  {
    key: '--px-br-b',
    label: 'Prayers — bottom spray',
    src: '/premium/br-b.avif',
    srcFallback: '/premium/br-b.webp',
    format: 'png-alpha',
    size: '900 × 550',
    notes: 'Wide low spray that runs along the bottom edge into the corner cluster.',
  },

  /* ── Scene 4, INFO. Gold line-art corners plus watercolour, per ReferenceC. */
  {
    key: '--px-corner-tl',
    label: 'Info — gold sunflower corner, top left',
    src: '/premium/corner-tl.avif',
    srcFallback: '/premium/corner-tl.webp',
    format: 'png-alpha',
    size: '720 × 720',
    notes:
      "CornerA rotated 180°. The source art sits in its bottom-right quadrant " +
      '(measured, not assumed), so the top-left copy is the flipped one.',
  },
  {
    key: '--px-corner-br',
    label: 'Info — gold sunflower corner, bottom right',
    src: '/premium/corner-br.avif',
    srcFallback: '/premium/corner-br.webp',
    format: 'png-alpha',
    size: '720 × 720',
    notes: 'CornerA in its native orientation.',
  },
  {
    key: '--px-mf-a',
    label: 'Info — mid-frame right cluster',
    src: '/premium/mf-a.avif',
    srcFallback: '/premium/mf-a.webp',
    format: 'png-alpha',
    size: '768 × 900',
    notes: 'Sunflowers with wispy greenery, sitting mid-height on the right edge.',
  },
  {
    key: '--px-bl-a',
    label: 'Info — bottom-left cluster',
    src: '/premium/bl-a.avif',
    srcFallback: '/premium/bl-a.webp',
    format: 'png-alpha',
    size: '900 × 915',
    notes: 'Large L-shaped corner cluster with pale filler flowers.',
  },
  {
    key: '--px-seal',
    label: 'Wax seal / monogram',
    src: null,
    format: 'svg',
    size: '240 × 240  (renders at 82 CSS px, centred on the flap apex at 62%)',
    notes:
      'Square, centred, transparent. SVG so the monogram stays sharp and can be ' +
      'recoloured in code. This is the tap target that opens the envelope, so keep the ' +
      'artwork close to the full box — a small mark on a large canvas gives a tap target ' +
      'smaller than it looks. Until supplied, CSS draws a gradient disc with "ZS".',
  },
  {
    key: '--px-filigree',
    label: 'Gold corner filigree',
    src: null,
    format: 'svg',
    size: '220 × 220',
    notes:
      'One corner only — CSS mirrors it into the other three. SVG so the stroke can be ' +
      'animated as a draw-on, which raster cannot do. Optional now that the corner ' +
      'bouquets carry the scene corners; keep only if it does not crowd them.',
  },
] as const;

/** Count of layers still awaiting real art, shown in the lab UI. */
export const pendingAssetCount = premiumAssets.filter((a) => !a.src).length;
