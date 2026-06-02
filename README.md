# Landmark

A mobile app for mapping and organizing what's on your property: walk out areas with GPS, drop pins on things worth remembering, attach photos and notes, and group everything into categories.

Built with [Expo](https://expo.dev) / React Native. Android-first, runs in **Expo Go** — no native build needed during development.

## Running it on your phone

1. Install **Expo Go** from the Play Store on your Android phone.
2. On your computer (same Wi-Fi network as the phone):

   ```bash
   npm install
   npm start
   ```

3. Scan the QR code that appears in the terminal with Expo Go (or with the camera app).

That's it. The app reloads live as code changes.

> **Note:** if the phone and computer are on different networks, use `npx expo start --tunnel` instead of `npm start`.

## What it does (current increment)

- **Map view** — satellite/hybrid map centered on your position
- **Drop pin** — capture your current GPS position, name it, add notes and photos
- **Walk area** — record a GPS breadcrumb trail as you walk; save it as an area (closed boundary) or a path
- **Categories** — create color-coded categories and filter the map by them
- **Details** — view, edit, and delete anything you've saved

Everything is stored locally on the phone in SQLite. No account, no internet needed in the field.

## Development

```bash
npm start          # dev server (scan QR with Expo Go)
npm test           # run unit tests
npm run typecheck  # TypeScript check
```

### Project layout

```
src/
  app/          # screens (expo-router file-based routing)
  components/   # reusable UI pieces
  db/           # SQLite schema, migrations, repositories
  hooks/        # GPS tracking, location
  lib/          # pure logic: geometry math, types, photo storage
  store/        # zustand stores (in-memory app state)
  constants/    # theme, colors
legacy/         # previous web-based prototype (kept for reference)
```

### Where this is going

See [ROADMAP.md](./ROADMAP.md) for the planned increments.
