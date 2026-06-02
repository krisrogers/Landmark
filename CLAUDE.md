# Landmark

Mobile app (Expo / React Native, Android-first) for mapping a rural property: GPS-walked areas, pins, photos, notes, categories.

## Commands

- `npm test` — jest unit tests
- `npm run typecheck` — tsc
- `npm start` — Expo dev server (requires a phone with a development build; not usable in CI/remote sessions)

Always run `npm test` and `npm run typecheck` before committing. There is no emulator in remote sessions — UI changes can only be truly verified by the user on a device.

## Delivery

The user installs the app as a standalone APK built with EAS (`preview` profile) and receives updates over the air via `eas update --channel preview`. They run these commands themselves on their laptop; remote sessions cannot run EAS commands (no auth).

- **JS-only changes** (most work): reach the user via `eas update`. Just push to the branch and tell the user to run the update command.
- **Native changes** (new native module, app.json plugin changes, Expo SDK upgrade): require a full APK rebuild + reinstall. Call this out explicitly in the handoff message, and expect more friction — batch native changes together when possible.

## Architecture

- **Screens**: `src/app/` (expo-router file-based routing)
- **Data flow**: SQLite (`src/db/`) is the source of truth → hydrated into a zustand store (`src/store/dataStore.ts`) on launch → all mutations write DB first, then update the store. UI reads only from the store.
- **Geometry**: GeoJSON-style objects (`[lng, lat]` order) defined in `src/lib/geo.ts`, stored as JSON strings in SQLite. Pure math (distance/area) lives there too — keep it dependency-free and unit-tested.
- **Maps**: MapLibre (`@maplibre/maplibre-react-native` v11 API: `Map`, `Camera`, `GeoJSONSource`, `Layer`). Basemap styles (free Esri satellite / OSM raster tiles) in `src/lib/mapStyles.ts`. Features render via one GeoJSON source with data-driven styling (`src/components/FeatureOverlays.tsx`).
- **Capture flow**: map screen captures a geometry → puts it in `captureStore` → form screen (`feature/new.tsx`) reads it and saves.
- **Photos**: copied into `<documentDirectory>/photos/` via `src/lib/photoStorage.ts`; DB stores filenames only.

## Constraints

- **Expo Go does NOT work** with this app (MapLibre is a native module). The user's dev loop is an EAS development build; field use is an EAS preview APK with OTA updates. Prefer JS-only changes — adding native modules forces the user to rebuild and reinstall the APK.
- Schema changes go in `src/db/database.ts` as new entries in the `MIGRATIONS` array — never edit old migrations.
- Keep the schema sync-ready: UUID ids, `created_at`/`updated_at`, soft deletes (`deleted_at`).
- `legacy/` is the old web prototype — reference only, never build on it, excluded from tsc/jest.

## Increment discipline

This project is built in small usable increments (see ROADMAP.md). Resist adding features beyond what the current increment needs. The user field-tests each increment on their property before the next one starts.
