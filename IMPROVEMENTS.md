# UX Improvements Plan

Source: persona-based UX review (2026-07-04). Personas covered: fresh first-time visitor (peers, via WhatsApp), day-of guest revisiting for location, older guests (parents' generation), and returning guests who already RSVP'd.

**Workflow:** implement everything on a branch `ux-improvements`, preview the whole result, then merge to `master` only after approval.

```bash
git checkout -b ux-improvements
```

Verify each item on mobile viewport (375px) via `npm run build && npm run preview`.

---

## P1 — Critical

### 1. Event-day banner (day-of persona)
On the event day (and the day before), show a pinned bar at the very top of the page:

> **Majlis hari ini 🎉** — [Buka Waze] [Google Maps]

- Small inline `<script>` in `src/layouts/Layout.astro` or a new `EventDayBanner.astro` component rendered first inside `<main>`.
- Compare device date against `site.event.dateISO` (compare local date strings, not UTC — guests are all in MYT but device date is what matters).
- Day before the event: same banner with "Majlis esok" wording.
- Buttons use the existing `site.venue.maps.waze` / `site.venue.maps.googleMaps` links.
- Hidden entirely on all other days. No layout shift when hidden (render nothing, not an empty bar).

### 2. Sticky quick-nav chips (all revisit journeys)
After the user scrolls past the hero, show a sticky top bar with anchor chips:

`Butiran · RSVP · Lokasi · Hubungi`

- Anchors: `#butiran`, `#rsvp`, `#cara-ke-sana`, `#penutup`.
- Appear only after hero is scrolled past (IntersectionObserver on the hero section); avoids polluting the first impression.
- Chips: min 44px tap height, horizontal scroll if needed at 375px (should fit).
- Add `scroll-behavior: smooth` and `scroll-margin-top` on sections so anchors don't hide under the sticky bar.

### 3. OG image for WhatsApp preview (fresh-visit persona)
The invite spreads via WhatsApp; the link preview is the envelope.

- Create `public/og.png` (or `.jpg`), 1200×630: couple's names, date, "Temerloh, Pahang" on the site's stone palette. (Placeholder acceptable on the branch; final artwork alongside the visual-direction pass.)
- In `src/layouts/Layout.astro` add:
  - `og:image` (absolute URL, derived from `Astro.site`: `https://www.mytetamu.my/og.png`)
  - `og:image:width` / `og:image:height`
  - `og:url`
- Verify by pasting the deploy-preview URL into WhatsApp (or use opengraph.xyz).

---

## P2 — Moderate

### 4. RSVP submitted-state memory (returning RSVP'd persona)
Prevents "did it go through?" confusion and duplicate Supabase rows.

- In `src/components/SahkanKehadiran.astro`: on successful insert, `localStorage.setItem('rsvp-done', ...)`.
- On page load, if the flag exists: hide the form, show the success box, plus a small link "Hantar semula?" that clears the flag and re-shows the form.

### 5. Venue + town in hero (fresh-visit persona)
In `src/components/Hero.astro`, under the date line add:

> Elegant Glam Hall, Temerloh, Pahang

Pull from `site.venue` (add a short `town` field to `site.ts` if needed rather than hardcoding).

### 6. Calendar buttons de-ambiguated (older-guest persona)
In `src/components/ButiranMajlis.astro`, swap emphasis and relabel:

- Primary (`.btn`): **Simpan ke Google Calendar**
- Outline (`.btn-outline`): **Kalendar iPhone / Apple** (the `.ics` download)

Rationale: `.ics` on many Androids drops a mystery file in Downloads; Google Calendar link works everywhere.

### 7. Map iframe scroll-trap fix (day-of persona)
In `src/components/CaraKeSana.astro`: overlay the iframe with a transparent layer (`pointer-events` on the overlay, `pointer-events-none` semantics for the map) until tapped. Show hint text "Sentuh untuk gerakkan peta". One tap removes the overlay. The app tiles remain the primary CTA.

### 8. Contact surfacing + WhatsApp icon (older-guest persona)
- Move `whatsapp.svg` from the repo root to `public/icons/whatsapp.svg`.
- In `src/components/Penutup.astro`: add the WhatsApp icon inside the contact button (icon + text, icon ~20–24px, `aria-hidden="true"` since the label carries meaning).
- Give the contact block its own visible sub-heading "Sebarang Pertanyaan" so guests scanning section titles can find it ("Penutup" alone doesn't read as contact).
- Add a secondary `tel:` link ("Hubungi / Telefon") beside the WhatsApp button for guests who prefer calling. Reuse `site.penutup.contactPhone`.
- Optionally reuse the icon in the RSVP failure fallback link in `SahkanKehadiran.astro`.

---

## P3 — Minor polish

### 9. RSVP deadline
Add `rsvpDeadline` (display string) to `site.ts` and show under the "Sahkan Kehadiran" title: "Sila sahkan sebelum {tarikh}." (Confirm actual deadline date with Zul before merge.)

### 10. RSVP success next-step
Inside the success box in `SahkanKehadiran.astro`, add a "Simpan ke Google Calendar" button (reuse `googleCalendarUrl()`), so the success state isn't a dead end.

### 11. Copy-address button
In `CaraKeSana.astro`, under the address: "Salin alamat" button using `navigator.clipboard.writeText(venue.name + ', ' + venue.address)`, with brief "Disalin ✓" feedback. Guests paste it into family WhatsApp groups for whoever's driving.

### 12. Contrast nudge
`driveNote` in `CaraKeSana.astro` is useful info at `text-stone-500` (borderline AA on `stone-50`) — bump to `text-stone-600`. Don't introduce any new text lighter than `stone-500`.

---

## Out of scope for this branch
- Visual direction (theme/typography/hero media) — separate session per PRD §9.
- Content TODOs in `src/content/site.ts`, the three CSVs, and `public/qr-placeholder.svg` — content, not UX; must still be done before sending to guests.
- Final OG artwork (placeholder OK here).

## Definition of done (before merge)
- [ ] All P1 + P2 items implemented; P3 as time allows.
- [ ] `npm run build` passes with no errors.
- [ ] Walked through all three journeys at 375px: fresh scroll-through, simulated event-day banner (temporarily set `dateISO` to today to test, then revert), post-RSVP revisit.
- [ ] No regression: RSVP submit still writes to Supabase; map deep links still open apps.
- [ ] Deploy preview link pasted into WhatsApp shows the OG card.

---

## Pre-launch checklist (special page + tabung impian)

Carried over from the `/special` + Tabung Impian work (content-only, no code changes needed):

- [ ] Replace TODO rows in `homestay`, `aktiviti`, `gift_item`, and `fund_goal` tables via the Supabase Table Editor (the CSV pipeline is gone — these are now edited live in Supabase, not in the repo).
- [ ] Replace `public/qr-placeholder.svg` with the real DuitNow QR — this file is now used in **two** places: Salam Kaut (public page) and Tabung Impian (`/special`).
- [ ] Decide the final `/special` slug before sharing the friends-only link (current slug is `special`; confirm it's the one to send, or pick something less guessable).
