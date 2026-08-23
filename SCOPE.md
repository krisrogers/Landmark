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

## Explicitly Out of Scope (V2)

- **Consumables / inventory** (feed, seed, fuel, spare parts) — quantities and depletion do not
  fit the located-thing + task model; keeping them out preserves coherence
- Cloud sync, multi-user, conflict resolution
- Managed offline basemap packs (MBTiles), terrain / contour / DEM layers
- Automation, recommendations, AI features
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
