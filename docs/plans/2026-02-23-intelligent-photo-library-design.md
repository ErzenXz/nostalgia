# Intelligent Photo Library — UI Design

**Date:** 2026-02-23  
**Scope:** Photos browse page, Albums page, Album detail page, People integration

---

## Problem

The photo library has rich AI data (face embeddings, CLIP vectors, locations, tags, EXIF, memories) but surfaces almost none of it in the UI. Albums show folder icons with no thumbnails. The photos page lacks smart grouping. Face clusters exist in the backend but have no UI. The overall experience feels like a generic file browser rather than an intelligent personal archive.

## Goal

A film-lab-aesthetic photo library that feels genuinely smart: auto-organized by people, places, and time; beautiful mosaic album covers; expressive photo grids with date+location headers; and a fluid selection mode for bulk actions.

---

## Design Areas

### 1. Photos Browse Page (`/photos`) — Overhaul

**Filter chips** (horizontal scroll, below header):  
`All · Favorites · Videos · Has Location · People · By Camera`  
— tapping a chip filters the grid in place.

**Timeline rail** (left column on desktop `lg:`, floating button on mobile):  
Vertical list of months/years with photo counts. Clicking a month smooth-scrolls the grid to that month.

**Photos grid** — grouped by day:  
Each day gets a sticky header: `Monday, Feb 21 · Pristina, Kosovo` (location from first photo of day, if available). Photos rendered in a tight 3–4 column responsive grid (no masonry; uniform squares for scannability).

**Selection mode**:  
Tap the ☐ icon in the header OR long-press a photo → enter select mode. Photos show circular checkboxes. A bottom action bar slides up:  
`Add to Album · ❤ Favorite · Archive · Delete · (X selected)`

**No new backend queries needed** — photos page already loads `listByUser` with full metadata.

---

### 2. Albums Page (`/albums`) — Full Overhaul

**Smart Albums row** (horizontal scroll, pinned at top):  
Four auto-generated smart album types shown as large cards (200×160px):

| Card | Data source | Cover style |
|------|-------------|-------------|
| 👤 **People** | `people` table + `photoPeople` | Circular avatar collage |
| 📍 **Places** | Photos with `locationName` grouped | Location name + warm gradient |
| 🎞 **Memories** | `memories` table | Top memory cover photo |
| 📅 **Years** | Photos grouped by `takenAt` year | Year mosaic |

Clicking a smart album card opens a filtered view (not a new album, just a filtered photos grid).

**Your Albums grid** (below smart row):  
- Cards: 2–3 columns (mobile), 4–5 (desktop)
- Cover: 2×2 mosaic of first 4 photos OR single photo if < 4 photos; amber placeholder if empty
- Card footer: album name, photo count badge, date range (`2023 – 2024`)
- Hover: gentle scale + amber border glow

**Create Album** button → compact bottom sheet (mobile) / inline modal (desktop):  
Text input for name + optional description. Auto-suggests a name from selected photos if entering from selection mode.

---

### 3. Album Detail Page (`/albums/[id]`) — Overhaul

**Cinematic header**:  
Full-width blurred cover (first album photo), 240px tall. Overlay contains:
- Album name (heading font, white, text-shadow)
- `N photos · MMM YYYY – MMM YYYY · 📍 Top location`
- Action buttons: Share | Edit | Select | + Add Photos

**Quick stats strip** (below header, horizontal scroll on mobile):  
`📷 3 cameras · 📍 5 places · 👤 2 people · 🗓 14 days`

**Tab bar**: `Grid | Timeline`  
- Grid: Same 3-col responsive square grid as photos page  
- Timeline: Photos grouped by day within album

**Selection mode** inside album:  
Select button → checkboxes appear → bottom bar: `Remove from Album · ❤ · Delete`

**Add Photos sheet**:  
Full-screen overlay showing photos NOT currently in album. Filter + search. Tap to select, "Add N Photos" confirm button.

---

### 4. People Section (NEW)

Surface the existing `people` + `photoPeople` tables as a "People" smart album card on the albums page. Clicking opens a grid of face cluster cards:

- Circular thumbnail (largest face crop from any photo in cluster)
- Label: "Person A", "Person B", etc. (editable on tap)
- Photo count badge

Clicking a person opens a filtered photos grid (same component as album detail, but filtered by `personId`).

No new backend needed — `people` and `photoPeople` tables already exist.

---

## Visual Language

Consistent with the established "Darkroom / Film Lab" aesthetic:
- Background: `#0a0908` / `background`
- Cards: `film-print` class (amber-tinted border, subtle warm gradient bg)
- Mosaic covers: real thumbnails via `usePhotoUrl()` hooks
- Action bars: amber gradient buttons, monospace labels
- Selection checkboxes: amber-500 fill when checked
- Day headers: monospace, amber-900/50, sticky on scroll
- Smart album cards: larger, with amber glow on hover

---

## What Does NOT Change

- All Convex queries / mutations / data fetching logic
- Photo encryption / decryption flow
- Feed page (already redesigned)
- Photo detail page (already redesigned)
- Sidebar / navigation shell (already redesigned)

---

## Implementation Order

1. **Photos page** — filter chips + day-group headers with location + selection mode refactor
2. **Albums page** — smart albums strip (People / Places / Memories / Years) + mosaic covers
3. **Album detail** — cinematic header + stats strip + tabs + add-photos sheet + selection mode
4. **People grid** — face cluster cards (surfaced as smart album sub-page)
