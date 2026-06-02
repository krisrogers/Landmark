# Roadmap

Built in small increments. Each increment is something genuinely usable in the field — try it, adjust, then move to the next one. Nothing below is fixed; field use decides what's next.

## ✅ Increment 1 — Capture & organize (current)

The core field workflow:

- Map (satellite) with GPS position
- Drop pins at your location with name, notes, photos
- Walk areas/paths with GPS breadcrumbs
- Color-coded categories + map filtering
- View / edit / delete saved items
- Local SQLite storage (sync-ready schema: UUIDs, timestamps, soft deletes)

## Increment 2 — Field usability

Refinements that only show up after real use. Likely candidates:

- Offline map tiles (cache the satellite imagery of your property)
- List view of everything saved (sortable, searchable) alongside the map
- Better GPS feedback while walking (accuracy indicator, pause/resume)
- Full-screen photo viewer
- Manual geometry editing (nudge points, delete bad breadcrumbs)

## Increment 3 — Beyond references

The earlier prototype had ideas worth bringing back once capture feels good:

- Observations: timestamped notes/photos attached to an existing feature ("the dam looks low today")
- Tasks: things to do at a place ("fix this fence section")
- Measurements with history (water level, fruit yield, ...)

## Increment 4 — Sync & sharing

- Cloud backup / sync (schema is already designed for this)
- Export (GeoJSON / KML for use in other tools)
- Sharing with family members

## Delivery setup (done)

- Standalone APK via EAS Build (`preview` profile) — no laptop needed in the field
- Over-the-air updates via EAS Update — new increments reach the phone without reinstalling
- MapLibre + free Esri satellite imagery — no Google account / API key required

## Possible later (needs APK rebuild)

- Background location permission so walks keep recording with the screen off
- Play Store release (production profile already configured in eas.json)
