# PLAN.md - Landmark Implementation Plan

## Executive Summary

Landmark is an offline-first field notebook and land-planning system targeting Android mobile and web browsers from a single TypeScript codebase. The system prioritizes field usability, data longevity, and conceptual clarity.

---

## 1. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 18 + TypeScript | Cross-platform, mature ecosystem, hooks architecture |
| State | Zustand | Lightweight, TypeScript-native, persistence support |
| Styling | Tailwind CSS | Utility-first, large touch targets, responsive |
| Database (Web) | sql.js (WebAssembly SQLite) | True offline, same SQL schema |
| Database (Native) | @capacitor-community/sqlite | Native SQLite performance |
| Maps | Leaflet + Leaflet.draw | Lightweight, offline-capable, drawing tools |
| Geo Utils | Turf.js | Area/distance calculations |
| Mobile | Capacitor 5 | Web-to-native bridge, filesystem, camera, GPS |
| PWA | vite-plugin-pwa | Service worker, offline caching |
| Build | Vite 5 | Fast HMR, native ESM, TypeScript |

---

## 2. Project Structure

```
/landmark
├── android/                    # Capacitor Android project
├── public/
│   ├── templates/              # Bundled JSON templates
│   │   ├── generic-feature.json
│   │   ├── tree.json
│   │   ├── planting-row.json
│   │   ├── water-point.json
│   │   ├── soil-pit.json
│   │   └── weed-patch.json
│   └── icons/                  # PWA icons
├── src/
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Root component with routing
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   ├── FeatureLayer.tsx
│   │   │   ├── DrawingTools.tsx
│   │   │   ├── GpsControl.tsx
│   │   │   └── BasemapSelector.tsx
│   │   │
│   │   ├── features/
│   │   │   ├── FeatureList.tsx
│   │   │   ├── FeatureDetail.tsx
│   │   │   ├── FeatureForm.tsx
│   │   │   └── FeatureTimeline.tsx
│   │   │
│   │   ├── observations/
│   │   │   ├── ObservationCard.tsx
│   │   │   └── ObservationForm.tsx
│   │   │
│   │   ├── measurements/
│   │   │   ├── MeasurementCard.tsx
│   │   │   └── MeasurementForm.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskList.tsx
│   │   │
│   │   ├── templates/
│   │   │   ├── TemplateSelector.tsx
│   │   │   └── TemplateEditor.tsx
│   │   │
│   │   ├── media/
│   │   │   ├── PhotoCapture.tsx
│   │   │   ├── VoiceRecorder.tsx
│   │   │   └── MediaGallery.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   │
│   ├── pages/
│   │   ├── MapPage.tsx
│   │   ├── FeaturePage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── TemplatesPage.tsx
│   │   ├── ExportPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── services/
│   │   ├── database/
│   │   │   ├── DatabaseService.ts
│   │   │   ├── WebDatabase.ts
│   │   │   ├── NativeDatabase.ts
│   │   │   ├── migrations/
│   │   │   │   ├── index.ts
│   │   │   │   └── 001_initial.ts
│   │   │   └── queries/
│   │   │       ├── features.ts
│   │   │       ├── observations.ts
│   │   │       ├── measurements.ts
│   │   │       └── tasks.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── MediaStorage.ts
│   │   │   ├── WebMediaStorage.ts
│   │   │   └── NativeMediaStorage.ts
│   │   │
│   │   ├── geo/
│   │   │   ├── calculations.ts
│   │   │   └── geojson.ts
│   │   │
│   │   ├── export/
│   │   │   ├── ProjectExporter.ts
│   │   │   └── ProjectImporter.ts
│   │   │
│   │   └── templates/
│   │       └── TemplateService.ts
│   │
│   ├── store/
│   │   ├── index.ts
│   │   ├── featureStore.ts
│   │   ├── mapStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── hooks/
│   │   ├── useDatabase.ts
│   │   ├── useFeatures.ts
│   │   ├── useGeolocation.ts
│   │   └── useOfflineStatus.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── feature.ts
│   │   ├── observation.ts
│   │   ├── measurement.ts
│   │   ├── task.ts
│   │   ├── template.ts
│   │   └── media.ts
│   │
│   ├── utils/
│   │   ├── uuid.ts
│   │   ├── datetime.ts
│   │   └── platform.ts
│   │
│   └── styles/
│       └── index.css
│
├── capacitor.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── SCOPE.md
└── PLAN.md
```

---

## 3. Database Schema

```sql
-- Features: places on land
CREATE TABLE features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    geometry_type TEXT NOT NULL CHECK (geometry_type IN ('Point', 'LineString', 'Polygon')),
    geometry TEXT NOT NULL,  -- GeoJSON
    template_id TEXT,
    tags TEXT,  -- JSON array
    properties TEXT,  -- JSON object
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
);

-- Observations: timestamped records
CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL,
    notes TEXT,
    tags TEXT,  -- JSON array
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    observer_latitude REAL,
    observer_longitude REAL,
    observer_accuracy REAL,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- Measurements: structured observations with units
CREATE TABLE measurements (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'estimated' CHECK (method IN ('estimated', 'measured', 'derived')),
    accuracy REAL,
    confidence TEXT CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high')),
    notes TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- Tasks: future or ongoing actions
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done', 'abandoned')),
    priority INTEGER,
    due_date TEXT,
    tags TEXT,  -- JSON array
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- Templates: reusable capture schemas
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    schema TEXT NOT NULL,  -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Media: photos, voice notes
CREATE TABLE media (
    id TEXT PRIMARY KEY,
    feature_id TEXT,
    observation_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('photo', 'audio', 'video', 'document')),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    duration_seconds REAL,
    caption TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE SET NULL,
    FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE SET NULL
);

-- Settings: app preferences
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schema versioning
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);
```

---

## 4. Implementation Phases

### Phase 1: Foundation
- Project scaffolding (Vite + React + TypeScript + Tailwind)
- Capacitor setup
- Database abstraction layer
- Core TypeScript types
- Basic page routing

### Phase 2: Map Core
- Leaflet integration
- GPS location with accuracy circle
- Feature rendering (points, lines, polygons)
- Basemap selector (OSM, Satellite)
- Offline fallback

### Phase 3: Feature Capture
- Add Point via GPS (≤2 taps)
- Drawing tools (line, polygon)
- Template selector
- Feature CRUD operations

### Phase 4: Feature Detail & Timeline
- Feature detail view
- Chronological timeline
- Observation creation
- Measurement creation

### Phase 5: Media Capture
- Photo capture (camera + gallery)
- Voice note recording
- Media storage (OPFS for web, Filesystem for native)
- Media gallery display

### Phase 6: Tasks
- Task creation from feature
- Status management
- Global task list with filters
- Task timeline display

### Phase 7: Templates
- Bundled template loading
- Template editor (JSON)
- Template validation
- Template application

### Phase 8: Export/Import
- ZIP export (data + media)
- Import with replace/merge
- Progress indicators

### Phase 9: Polish
- PWA configuration
- Performance optimization
- Field usability testing
- Error handling

---

## 5. Key Technical Decisions

### Offline-First Data
- SQLite as single source of truth
- Auto-persist after each write
- No network dependency for core features

### GeoJSON Storage
- Stored as TEXT in SQLite
- Parsed/serialized on read/write
- Calculations via Turf.js

### Media Storage
- Web: Origin Private File System (OPFS)
- Native: Capacitor Filesystem
- Database stores references only

### Template System
- JSON schema format
- Bundled templates loaded on first run
- User templates stored in database

### Export Format
- ZIP archive with JSON data
- Media files included
- Version-tagged manifest
