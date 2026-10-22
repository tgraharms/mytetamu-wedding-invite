# Wedding Landing Page — PRD

**Owner:** Zul
**Build approach:** Vibe coded (self-built)
**Page language:** Bahasa Melayu (full)
**Venue:** Temerloh, Pahang (night wedding)
**Status:** Draft v1

---

## 1. Context & Purpose

A single-page wedding site for guests, opened almost entirely from a WhatsApp link on mobile.

It has two jobs:

1. Be a proper wedding landing page like every other couple has (details, RSVP, the warm stuff).
2. Actively lower the friction for KL/Selangor guests driving to a night wedding in Temerloh, roughly 1.5 to 2 hours from KL with a night-time return on top of that.

Job 2 is the differentiator. It should steer layout, ordering, and what earns space on the page.

---

## 2. Goals & Success Signals

**Primary goals**
- Capture RSVPs in a place Zul can read.
- Let guests find their way, decide where to stay, and plan their day without DMing the couple.
- Feel warm, intuitive, and effortless on a phone.

**Success signals** (loose, this is a wedding not a SaaS)
- RSVPs land cleanly in storage.
- Guests self-serve directions and homestays.
- The couple's inbox stays quiet of "macam mana nak pergi" and "ada homestay tak" questions.

---

## 3. Audience

One guest list, two reading modes. The same page serves both through scroll depth.

| Mode | Wants | Served by |
|------|-------|-----------|
| **Skimmer** | Date, time, place, RSVP, then gone | Essentials + RSVP placed high |
| **Planner** | Where to sleep, the route, what to do | Travel-support sections below |

---

## 4. Information Architecture (scroll order)

The spine of the build. Top to bottom:

1. **Hero** — greeting, couple's names, date headline
2. **Butiran Majlis** (Essentials) — date, time, venue, save to calendar
3. **Sahkan Kehadiran** (RSVP) — placed high so Skimmers can confirm and leave
4. **Cara Ke Sana** (Getting there) — map, Waze + Maps deep links, drive note
5. **Tempat Penginapan** (Homestays) — curated nearby stays
6. **Sementara di Pahang** (Activities) — things to do
7. **Cadangan Hadiah** (Gift wishlist)
8. **Salam Kaut** (Cash gift QR)
9. **Penutup** (Closing) — doa, terima kasih, contact person

RSVP sits directly under essentials on purpose. The Skimmer's whole journey is confirm and leave, so it should not be buried under homestays.

---

## 5. Section Requirements

### 5.1 Hero
- **Contents:** opening salam and bismillah (matching the warm tone of a Malay invite), couple's names, headline date, a subtle scroll cue.
- **Optional media:** static image or simple animation (parked, see §9).
- **Behavior:** static. No interaction beyond scroll.

### 5.2 Butiran Majlis (Essentials)
- **Contents:** full date with day name, time window, venue name and short address line.
- **Save to calendar:** ICS file download plus a Google Calendar link. High value here because guests need to plan a trip around a night event.
- **Malay microcopy:** section label "Butiran Majlis", button "Simpan ke Kalendar".
- **Data source:** hardcoded.

### 5.3 Sahkan Kehadiran (RSVP)
- **Fields:**
  - Nama (text, required)
  - Bilangan kehadiran / pax (number, required)
  - Bermalam di Pahang? (Ya / Tidak toggle, optional)
  - Hantar (submit)
- **Behavior:** on submit, write to storage, show a warm confirmation ("Terima kasih, kehadiran anda telah disahkan").
- **Deliberately simple:** no duplicate prevention, no edit-after-submit, no login.
- **Why the bermalam field stays:** gives Zul a feel for how many guests are staying over, useful as a personal signal even though the homestay list is static.
- **Data source:** writes to a data store (Supabase fits the stack).

### 5.4 Cara Ke Sana (Getting there)
- **Contents:** venue address, embedded map or pin, a one-line drive note from KL, deep links.
- **Deep links:** Waze link and Google Maps link, both opening the native app on tap.
- **Malay microcopy:** "Buka di Waze", "Buka di Google Maps".
- **Data source:** hardcoded (venue coordinates + address).

### 5.5 Tempat Penginapan (Homestays)
- **Model:** curated list supplied by Zul as a CSV, hardcoded or loaded on open. Display only, no booking.
- **Per item (suggested CSV columns):** `nama`, `jarak_ke_venue`, `anggaran_harga`, `pautan` (maps or contact), `nota`.
- **Behavior:** each item links out to maps or a contact number. The site itself handles no transactions.

### 5.6 Sementara di Pahang (Activities)
- **Model:** same as homestays. CSV in, display out.
- **Per item (suggested CSV columns):** `nama`, `kategori`, `jarak`, `pautan`, `nota`.
- **Purpose:** give Planners a reason to make a day or weekend of the trip.

### 5.7 Cadangan Hadiah (Gift wishlist)
- **Model:** same CSV-driven display pattern.
- **Per item (suggested CSV columns):** `item`, `pautan`, `nota`.
- **Behavior:** items link out to where they can be bought. No checkout on-site.

### 5.8 Salam Kaut (Cash gift QR)
- **Contents:** a payment QR image with a short, gentle line of framing.
- **Placement:** low on the page, by design. Leading with a cash QR reads grabby to some guests, so it stays tucked near the gift section.
- **Behavior:** displays a static QR image. No payment gateway, no processing.
- **Status:** exact framing and visual treatment parked for the build phase (see §9).

### 5.9 Penutup (Closing)
- **Contents:** a short doa, a thank-you line, and a contact person with a number for any questions.
- **Data source:** hardcoded.

---

## 6. UX Principles

- **Mobile-first and one-thumb usable.** Nearly all opens come from a WhatsApp link on a phone. Design for the small screen first, generous tap targets.
- **Fast load.** Mostly static content means the page should feel instant.
- **Full Bahasa Melayu** across every label, button, and message.
- **Native handoffs.** Calendar, Waze, and Maps links open the relevant app directly.
- **Quiet hierarchy.** Essentials and RSVP read in seconds. Travel-support depth waits below for those who scroll.

---

## 7. Data Model (light)

The whole app reduces to one simple rule: **RSVP writes, everything else reads from static content Zul controls.**

| Data | Type | Source | Notes |
|------|------|--------|-------|
| RSVP submissions | Read/write | Data store (e.g. Supabase) | Fields: nama, pax, bermalam, created_at |
| Homestays | Read-only | CSV | Display only |
| Activities | Read-only | CSV | Display only |
| Gift wishlist | Read-only | CSV | Display only |
| Venue, date, time, doa, contact | Read-only | Hardcoded | |
| Salam Kaut QR | Asset | Image file | Static |

This keeps the build close to a static site with one small backend touch for RSVP. Updating content later means editing a CSV, not touching code.

---

## 8. Out of Scope

- WhatsApp automation or any messaging integration.
- Guest login, accounts, or profiles.
- Seating charts.
- Booking or payment processing of any kind (Salam Kaut is a QR image only).
- Duplicate RSVP prevention.
- Multi-language (Malay only).

---

## 9. Open & Parked Decisions

- **Visual direction.** Theme, colors, typography, hero media still open. To be explored with inspo and a mockup tool before any build (separate working session).
- **Salam Kaut framing.** Exact wording and visual treatment to be decided at build time. Gentle, low placement agreed in principle.
- **Hero media.** Static image versus simple animation, decided alongside the visual direction.

---

## 10. Content You Need to Supply

Before building, gather:

- Couple's names and parents' names (as they should read).
- Exact date, day name, and time window.
- Venue name, full address, and map coordinates.
- `homestays.csv`, `activities.csv`, `gifts.csv` (columns suggested above).
- Salam Kaut QR image.
- Doa text and closing thank-you line.
- Contact person name and number.
- Any hero image or media (optional, can come later with the visual direction).
