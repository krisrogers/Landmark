# Landmark — V2 Scope

## Purpose

Landmark is an offline-first **homestead stewardship** system.

It began as a field notebook for marking places on land. V2 broadens that intent: the
things you steward on a property are not only *places* — they are also *assets* (a tractor,
a house, a mob of sheep), and what ties them together is the **work** you plan and carry out
over time. Landmark lets a single user mark places and assets, hang tasks and reminders on
them, and see — on a map or in a list — what needs attention across the whole property.

Landmark still prioritises:

- **Field usability**
- **Longevity of data**
- **Conceptual clarity over feature breadth**

The guiding image is unchanged in spirit, only wider in scope: *walk the land, mark what
matters, and never rely on memory for what you saw or what still needs doing.*

---

## Core Design Principles

1. **Offline-first**: all core functionality works without connectivity
2. **Local-first**: no accounts, no cloud, no sync in V2
3. **Same codebase**: Android + Web (PWA-style)
4. **Basemap as context, not truth**
5. **Unify the verbs, not the nouns** — Places and Assets stay distinct types, but they
   share one spine of stewardship behaviours (tasks, reminders, tags, photos, notes, history).
6. **Prefer tags over rigid classifiers** — anything a flexible tag can express (condition,
   intent, grouping, "projects") is a tag, not a hard-coded concept.
7. **The task is the protagonist** — planning and execution are task-centric; places and
   assets are what tasks hang from.
8. **AI is advisory and gated** — AI never acts on the map on its own; it advises *on request*,
   is a paid-tier capability, and **the app (not the model) interprets the land** while the model
   reasons about horticulture.

---

## Core Concepts

### 1. Place

A fixed location or area on the land. Stored as GeoJSON.

- **Geometry**: Point, Line, or Polygon
- **Captured by**: dropping a point at your GPS location, **walking a boundary** with GPS
  (track → polygon), or drawing on the map (desk planning)

Examples: a dam, a felling site, a boundary fence, a permaculture/syntropic zone, a paddock.

A Place's location is *fixed* — it is a spot or shape on the land.

### 2. Asset

A discrete thing you own and maintain.

- Has an **optional location** that **can change** — either a map pin or "at a Place"
  (e.g. the sheep mob is *in* the North Paddock; the tractor is *at* the Machinery Shed).
- **Its tasks travel with it.** Move the asset and its tasks move too — they are bound to the
  asset, not to a coordinate. This is the entire reason Assets exist as their own type.

Examples: tractor, house, water pump, a mob of sheep.

### 3. Task

The protagonist. A unit of work or intent.

- Attaches to a **Place**, an **Asset**, a **map pin**, or **nothing** (a location-less job).
- **Reminder date** — an optional "remind me by" date (deliberately *not* a hard deadline).
- **Recurrence** — optional, a **fixed interval** in V2 (e.g. every 12 months). Seasonal /
  around-a-date recurrence is deferred (see below).
- **Tags**, a **photo**, **notes**.
- **Done state** that records *when* it was completed. Completing a recurring task schedules
  the next occurrence.

### 4. Tag

A flexible, user-defined label. The primary grouping and classification mechanism.

- A thing or task may carry any number of tags.
- **Condition is a tag** (`needs-repair`, `service-soon`) — there is no separate status field.
- **A "project" is a tag** (`winter-prep`, `new-shed`) that groups tasks across many places
  and assets.
- Tags are how you build findable working sets ("show me everything tagged `fell`").

### 5. Reminder

A date on a task, surfaced when it comes due.

- Can be **snoozed** (pushed out) or **dismissed** (cleared without completing the task).
- Recurring tasks generate their next reminder on completion.

### 6. Media

Photos attached to things and tasks. Voice notes are deferred.

### 7. Measurement (lightweight)

Optional structured values with units (engine hours, tank level, canopy width). Retained from
V1 but no longer central; a Measurement is just another dated entry in a thing's history.

### 8. History / Timeline (derived)

Each Place and Asset shows a chronological history — but it is **assembled**, not stored as its
own object. It is composed of: dated notes, added photos, recorded measurements, condition
(tag) changes, and completed tasks. This preserves the "come back a year later and understand
it" promise with fewer core concepts.

---

## Views

- **Map** — the home screen. Shows Places and *located* Assets as markers. Filter by **tag**
  and by **time** ("what's due in the next 30 days"). Answers *what needs attention, and where*.
- **Due** — everything coming up or overdue across the whole homestead. **Group by Date, Tag,
  or Place.** Snooze or complete inline.
- **Things** — browse all Places and Assets; filter by tag.
- **Detail** — a Place or Asset with its identity, location, tags, open tasks, and derived
  history. Add tasks, notes, photos, measurements from here.
- **Settings** — preferences, basemaps, export/import.

---

## Feature Capture (Offline)

- Add Point via GPS
- **Walk an area** — trace a boundary by walking it with GPS (track → polygon)
- Draw on map (tap-to-place, for desk planning)
- Add an Asset (locate now or later; place as a pin or "at a Place")
- Quick Task (attach to anything, or nothing)

Fast capture remains a priority.

---

## AI Advisor (gated; advice-only this phase)

Landmark can, on request, give **site-specific planting and land-use advice** for a particular
Place. It is framed around **permaculture and syntropic** systems rather than generic gardening —
a focused lens gives sharper, more usable answers.

This is the first **gated** capability (see *Tiers & Gating*). It is deliberately **advice-only**
in this phase: the advisor returns a written recommendation you read. Turning recommendations into
map features and tasks is **Plan B**, deferred until the advice itself is proven (see *Deferred*).

### Flow

1. Pick a Place (a measured area, a point, a walked boundary) and optionally attach **photos** and
   **notes** describing what's growing and the conditions.
2. Give an **objective** (e.g. "personal → commercial food production, syntropic system").
3. The app assembles a **site brief** from the Place's location via the regional context pipeline
   (below) and sends it, with your objective and photos, to Claude.
4. Claude returns advice; you read it. **Nothing is written to the map.**

### Division of labour

> **The app interprets the terrain; the AI does the horticulture.**

The app turns raw data into plain-language conditions ("upper-slope, north-facing — sun-facing in
the southern hemisphere — ~12° gradient, well-drained, high sun") and hands *that* to the model,
not raw numbers. Better answers, cheaper calls, more reliable output. The model is told explicitly
**what is known vs. unknown** and must not invent conditions it wasn't given.

### Transport — bring-your-own-key (this phase)

Landmark is a static, backend-less app. The advisor uses **BYO-key**: the user stores their own
Anthropic API key locally (Settings), and the app calls Claude **directly from the device**. *Your
key, your credits*, no server — and it doubles as the unlock for the gated feature. A hosted
**proxy** (so a paid tier can call without a personal key) is deferred to a public-release phase;
the advisor is written so the **transport can be swapped without touching the feature**.

### Offline behaviour

The AI call itself needs connectivity. But context is **pre-fetched and cached** when online
(terrain tiles and climate for the property), so a brief can be assembled in the field and the call
made as soon as there's signal. With no key or no connectivity the advisor is simply unavailable;
core mapping/measuring is unaffected.

---

## Regional Context

The site brief is built by a **regional, pluggable** context pipeline. Regionality is in the
architecture from the start; only **Australia** (plus a worldwide fallback) is implemented now.

- **Region resolver** — maps a location to a region key (`AU` inside Australia, else `global`).
- **Context providers** — one interface per kind of context, so sources are swappable per region:
  - `ElevationProvider` → elevation, **slope**, **aspect**, **landform** (ridge / mid-slope /
    gully), derived **on-device** from open elevation tiles
  - `ClimateProvider` → temperature range, rainfall, frost (Open-Meteo: keyless, cacheable)
  - `SoilProvider` → pH, texture (SoilGrids globally; CSIRO Soil & Landscape Grid for `AU`)
  - (`LandCoverProvider`, `WaterProvider` — later)
- **Region packs** — `global` uses worldwide sources; `AU` overrides where Australia has better
  data (Geoscience Australia DEM, CSIRO soil) and inherits `global` for the rest. **Adding a region
  = implement + register providers; no changes to existing code.**
- **Context assembler** — runs the active region's providers, applies **hemisphere-aware**
  interpretation, and produces the site brief. Any provider may fail, be offline, or not cover a
  spot; the brief **degrades gracefully**, omitting what it couldn't get and flagging it unknown.

Derived on-device from location alone (no network, works offline): hemisphere, day length, sun
angles, and — with cached elevation tiles — elevation, slope, aspect, landform.

---

## Tiers & Gating

Landmark ships a **free** tier and a **pro** tier, with the line drawn on **running cost**, not
arbitrarily:

- **Free** — all mapping, measuring, Places, Assets, tasks, reminders. Costs nothing to run.
- **Pro** — AI features, which carry a real per-call cost.

The gate is a thin `tier` check built in now. This phase unlocks "pro" by the **presence of a
BYO key**; later the same gate flips to a real entitlement **without changing feature code**.

---

## Data & Storage

### Local storage only

- One local project per device
- No accounts, no network dependency

### Storage model (direction)

- Local SQLite-backed data store
- `places` (geometry as GeoJSON) and `assets` (optional location: pin or place reference) as
  distinct tables sharing the stewardship spine
- `tasks` with a **polymorphic subject** (place / asset / standalone location), reminder date,
  recurrence interval, done/completed-at
- `tags` + `taggings` (many-to-many across places, assets, tasks)
- `media`, `measurements`, and dated `notes` referencing a place/asset/task
- History is a query over the above, not a table
- Migration path: V1's single `features` table splits into `places` + `assets`, and the V1
  `tasks`/`observations`/`measurements` scaffolding is reshaped around the new spine

### Import / export

- Export the full project as a file (data + media)
- Import to replace or merge

---

## Platforms

- **Mobile (Android)** — GPS-aware, one-handed field use
- **Web** — same codebase, offline-capable, optimised for planning and review

---

## Deferred (wanted, but not V2)

- **Seasonal / around-a-date recurrence** (e.g. "every spring", shearing windows) — V2 ships
  fixed-interval recurrence only
- **Voice notes**
- **Asset containment beyond "located at a Place"** (nesting hierarchies)
- **Walk-to-trace refinements** (pause/resume, drift smoothing)
- **AI Plan B — actionable advice**: turning recommendations into map features and care tasks
  (structured strata / spacing / succession output, tap-to-place). Deferred until advice-only
  (Plan A) is proven.
- **Hosted AI proxy** for a paid tier that calls without a personal key — BYO-key ships first
- **Further regions** beyond `AU` + `global`, and extra context providers (land cover, water /
  drainage)

## Explicitly Out of Scope (V2)

- **Consumables / inventory** (feed, seed, fuel, spare parts) — quantities and depletion do not
  fit the located-thing + task model; keeping them out preserves coherence
- Cloud sync, multi-user, conflict resolution
- Managed offline basemap packs (MBTiles); terrain / contour / DEM as a **displayed map layer**
  (DEM *sampled for AI site context* **is** in scope — see *AI Advisor*)
- **AI that acts on its own** — automation, or the model writing to the map unprompted (the advisor
  is request-only and advice-only this phase)
- Financial / cost tracking

---

## What changed from V1

- **Feature → Place + Asset.** The single "everything is a place on land" spine splits into two
  nouns; location becomes an optional, movable attribute of an Asset.
- **Task is now first-class** and can attach to a Place, an Asset, a map pin, or nothing.
- **Reminders** (with snooze/dismiss) and **fixed-interval recurrence** are in scope — V1
  explicitly excluded reminders and scheduling.
- **Condition and "projects" are tags**, not new concepts.
- **Observation** (as a formal immutable object) and heavy **Template** schemas retire; notes,
  tags and a **derived history** cover their ground with fewer moving parts.
- **New primary views**: a temporal/spatial **Map**, a cross-homestead **Due** list, and a
  **Things** browser.

---

## Non-Functional Requirements

- Same UI and logic on phone and web
- Predictable performance on low signal
- Exportable, inspectable data
- No proprietary data lock-in

---

## Success Test

Landmark V2 succeeds if:

> You can walk the land, mark a place or an asset, note what you see and what needs doing —
> and come back later knowing, at a glance, exactly what still needs attention and where,
> without relying on memory, signal, or external systems.
