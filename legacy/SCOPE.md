# Landmark — V1 Scope

## Purpose

Landmark is an offline-first field notebook and land-planning system.
It allows a single user to mark places, record observations and measurements, and plan interventions over time, directly in the field or at a desk, using the same codebase on phone and web.

Landmark prioritises:

- **Field usability**
- **Longevity of data**
- **Conceptual clarity over feature breadth**

---

## Core Design Principles

1. **Offline-first**: all core functionality works without connectivity
2. **Local-first**: no accounts, no cloud, no sync in V1
3. **Feature-centric**: everything attaches to a place on land
4. **Same codebase**: Android + Web (PWA-style)
5. **Basemap as context, not truth**

---

## Core Concepts

### 1. Feature

A Feature represents a place on land.

- **Geometry**: Point, Line, or Polygon
- Stored as GeoJSON

Examples:
- Tree
- Swale
- Fence line
- Wet patch
- Zone boundary
- Planting row

Every other object in Landmark attaches to a Feature.

---

### 2. Observation

A timestamped record of what is noticed.

- Text notes
- Tags
- Photos
- Voice notes (stored as media)

Observations are immutable records of state or perception.

---

### 3. Measurement

A structured observation with units.

- Metric (string)
- Value (number)
- Unit
- Method: estimated / measured / derived
- Optional accuracy or confidence

Measurements do not assume domain-specific meaning.

---

### 4. Task

A future or ongoing action tied to a Feature.

- Title
- Status: planned / active / done / abandoned
- Optional priority and due date

Tasks represent intent, not automation.

---

### 5. Template

A reusable capture schema.

- Defines default tags
- Defines measurement fields
- Suggests common tasks
- User-editable JSON (not hard-coded forms)

Templates make Landmark adaptable to:
- Permaculture
- Syntropics
- Forestry
- General land management

---

## Functional Scope (V1)

### 1. Map & Navigation

- Pan and zoom map
- Current GPS location with accuracy circle
- Display Features (points / lines / polygons)
- Select Feature from map
- Toggle Feature visibility by type or tag

Basemap is always visually subordinate to Features.

---

### 2. Basemaps

#### Online

When online, Landmark can display a background basemap:
- Satellite imagery
- Street / reference map

Basemaps are configurable and optional.

#### Offline

When offline:
- Landmark continues to function fully
- Features, GPS, drawing tools remain usable
- Basemap may be blank or minimally cached

No managed offline basemap packs in V1.

---

### 3. Feature Capture (Offline)

- Add Point via GPS
- Add Line / Polygon via tap-to-draw
- Select Template at creation
- Auto timestamp and metadata
- Attach:
  - Notes
  - Tags
  - Photos
  - Voice notes

Fast capture is prioritised (≤2 taps to save).

---

### 4. Feature Detail View

Each Feature has a single timeline containing:
- Observations
- Measurements
- Tasks

From this view:
- Add observation
- Add measurement
- Create task from observation

Timeline is chronological and append-only.

---

### 5. Measurements (V1)

Built-in support for:
- Distance (between points)
- Area (polygon)
- Simple numeric measurements (e.g. depth, diameter, flow estimate)

Measurements are generic and extensible via Templates.

---

### 6. Tasks

- Create task linked to Feature
- Update status
- Filter tasks by:
  - Status
  - Tag
  - Feature type

No reminders, automation, or scheduling logic in V1.

---

### 7. Templates

Initial bundled templates:
- Generic Feature
- Tree
- Row / planting line
- Water point
- Soil pit
- Weed patch

Templates:
- Live locally
- Are editable
- Do not require code changes to extend

---

## Data & Storage

### Local Storage Only

- One local project per device
- No accounts
- No network dependency

### Storage Model

- Local SQLite-backed data store
- Geometry stored as GeoJSON
- Media stored locally and referenced by URI

### Import / Export

- Export full project as a file (data + media)
- Import to replace or merge project

This provides manual continuity between devices.

---

## Platforms

### Mobile

- Android
- GPS-aware
- Optimised for one-handed field use

### Web

- Same codebase
- Offline-capable
- Optimised for planning, filtering, review

---

## Explicitly Out of Scope (V1)

- Cloud sync
- Multi-user collaboration
- Conflict resolution
- True offline basemap packs (MBTiles)
- Terrain, contour, or DEM layers
- Automation or recommendations
- AI features

---

## Non-Functional Requirements

- Same UI and logic on phone and web
- Predictable performance on low signal
- Exportable, inspectable data
- No proprietary data lock-in

---

## Success Test

Landmark succeeds if:

> You can walk the land, drop a marker, add a note, and come back a year later and still understand exactly what you saw and intended — without relying on memory, signal, or external systems.
