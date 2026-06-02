# Landmark

A mobile app for mapping and organizing what's on your property: walk out areas with GPS, drop pins on things worth remembering, attach photos and notes, and group everything into categories.

Built with [Expo](https://expo.dev) / React Native + [MapLibre](https://maplibre.org). Android-first. Everything is stored locally on the phone — no account, no internet needed in the field (except map imagery).

## Getting it on your phone

The app is installed as a normal APK — once it's on the phone, no laptop or dev server is needed.

### One-time setup (on a computer)

1. Create a free account at [expo.dev](https://expo.dev/signup)
2. Clone this repo and install:

   ```bash
   git clone https://github.com/krisrogers/Landmark.git
   cd Landmark
   npm install
   npm install -g eas-cli
   eas login
   ```

3. Link the project and enable over-the-air updates (both modify `app.json` — commit the changes):

   ```bash
   eas init
   eas update:configure
   git add app.json && git commit -m "Link EAS project"
   git push
   ```

### Build & install the app

```bash
eas build --platform android --profile preview
```

This builds the APK on Expo's servers (~10–15 minutes, free tier). When it finishes you get a **link and QR code** — open it on the phone, download the APK, and install it (Android will ask you to allow installs from unknown sources).

That's it. The app is now a regular app on your phone.

### Getting updates later

For changes that don't add new native code (most changes):

```bash
eas update --channel preview --message "describe the change"
```

The installed app downloads the update in the background next time it's opened, and applies it on the launch after that. **No rebuild, no reinstall, no laptop near the phone.**

If a change *does* add native code (rare — it'll be called out explicitly), rebuild and reinstall the APK with the `eas build` command above.

## What it does (current increment)

- **Map view** — satellite imagery (Esri) centered on your GPS position
- **Drop pin** — capture your current position, name it, add notes and photos
- **Walk area** — record a GPS breadcrumb trail as you walk; save it as an area (closed boundary) or a path
- **Categories** — create color-coded categories and filter the map by them
- **Details** — view, edit, and delete anything you've saved

## Development

```bash
npm test           # run unit tests
npm run typecheck  # TypeScript check
```

For live-reload development you need a **development build** on a phone (Expo Go does **not** work — the app uses MapLibre, a native module Expo Go doesn't include):

```bash
eas build --platform android --profile development   # one-time install on the phone
npm start                                             # then scan the QR from the dev build
```

After the dev build is installed once, the loop is the same as Expo Go: run `npm start`, scan, edit code, see it live. The dev build only needs rebuilding when native dependencies change.

### Project layout

```
src/
  app/          # screens (expo-router file-based routing)
  components/   # reusable UI pieces
  db/           # SQLite schema, migrations, repositories
  hooks/        # GPS tracking, location
  lib/          # pure logic: geometry math, types, photo storage, map styles
  store/        # zustand stores (in-memory app state)
  constants/    # theme, colors
legacy/         # previous web-based prototype (kept for reference)
```

### Where this is going

See [ROADMAP.md](./ROADMAP.md) for the planned increments.
