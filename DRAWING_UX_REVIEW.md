# Drawing Features UX Review

## Scope

Review of all drawing-related user interactions in Landmark: tool selection, geometry
creation (Point / LineString / Polygon), post-creation editing, feature display, and
supporting controls (GPS, filters, basemap).

Files examined:

- `src/components/map/DrawingTools.tsx` (DrawingTools + DrawingToolbar)
- `src/components/map/FeatureLayer.tsx`
- `src/components/map/MapControls.tsx`
- `src/components/map/MapView.tsx`
- `src/store/mapStore.ts`
- `src/pages/FeaturePage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/styles/index.css`

---

## 1. Critical Issues

### 1.1 No way to edit geometry after creation

Once a feature is drawn and saved, its geometry is permanent. The only option is
to delete the entire feature and redraw it. For polygons and lines that may have
many vertices this is a significant loss of work.

**Affected code:** `DrawingTools.tsx:109-113` — leaflet-draw's `edit` option is
explicitly disabled (`edit: false, remove: false`).

**Recommendation:** Enable leaflet-draw's edit mode on existing features, or add
a dedicated "Edit geometry" action on the FeaturePage that re-enters drawing mode
with the existing geometry loaded.

### 1.2 No undo during drawing

Leaflet-draw supports vertex removal (backspace / undo last point) but there is no
UI surface exposing this to the user. If a user mis-taps while drawing a polygon
with many vertices, the only escape is "Cancel Drawing" which discards everything.

**Recommendation:** Add an "Undo last vertex" button next to the Cancel button
while in line/polygon drawing mode. Leaflet-draw's `L.Draw.Polyline` emits
`drawDeleteLastVertex` which can be triggered programmatically.

### 1.3 Polygon icon is misleading

`DrawingToolbar` line 219-221 uses a "hamburger menu" icon (three horizontal lines)
for the polygon tool. This looks like a menu or list icon, not a polygon shape.

**Recommendation:** Replace with a proper polygon/pentagon outline SVG to match user
expectations.

### 1.4 Fragile auto-start via DOM click simulation

`DrawingTools.tsx:120-126` simulates a click on leaflet-draw's hidden toolbar button
using `setTimeout(() => { ... button.click() }, 100)`. This is brittle — if the DOM
hasn't rendered in 100 ms (slow device, background tab), drawing won't start and the
user sees the cancel button with no active drawing cursor.

**Recommendation:** Use leaflet-draw's programmatic API to start drawing:
```ts
new L.Draw.Polyline(map, options).enable();
```
This avoids DOM timing races entirely.

---

## 2. Major Issues

### 2.1 No error feedback when "Drop Point" fails

`DrawingToolbar.tsx:149-173` — `handleAddPointAtLocation` catches errors silently
(`console.error`). If GPS is unavailable or denied, the button appears to do nothing.

**Recommendation:** Show a toast or inline error: "Could not get your location.
Check GPS permissions."

### 2.2 No confirmation or preview before saving

Drawing completion immediately creates the feature and navigates away from the map
(`DrawingTools.tsx:54-62`). The user has no chance to review the shape, adjust it, or
cancel before it's committed to the database.

**Recommendation:** Show a confirmation step — either a lightweight "Save this
feature?" prompt overlaid on the map, or keep the drawn shape visible with
Save/Discard buttons before committing.

### 2.3 No drawing instructions or onboarding

There is zero in-context guidance for how to use the line/polygon tools. Leaflet-draw
requires clicking vertices and double-clicking to finish, but this isn't communicated
anywhere. New users will tap once and wonder why nothing happened.

**Recommendation:** Show a brief instruction banner while drawing, e.g. "Tap to add
points. Double-tap to finish." This can be a small overlay at the top of the screen
that appears when `drawingMode !== 'none'`.

### 2.4 Filter button only resets — can't actually filter

`MapControls.tsx:77-113` — the FilterButton `onClick` calls `resetFilters()`. There
is no UI to toggle individual geometry types or tags. The button acts as a "clear
filters" action but is visually presented as a "Filter features" control.

**Recommendation:** Open a filter panel/bottom sheet on click where users can toggle
geometry types and tags. Use `resetFilters` as a secondary "Clear all" action within
that panel.

### 2.5 `onAddPoint` prop is unused

`MapControls.tsx:10` passes `onAddPoint={() => {}}` as a no-op. The `DrawingToolbar`
accepts this prop (`DrawingToolbarProps`) but never calls it — it handles point
creation internally. This is dead code that could confuse maintainers.

**Recommendation:** Remove the `onAddPoint` prop from both `DrawingToolbarProps` and
the `MapControls` call site.

---

## 3. Moderate Issues

### 3.1 Accessibility gaps in drawing toolbar

- Toolbar buttons for line and polygon have `title` attributes but no `aria-label`.
  Screen readers will not announce the purpose of icon-only buttons.
- The "Cancel Drawing" button has no `aria-label`.
- Drawing state changes (entering/exiting draw mode, feature created) are not
  announced via an ARIA live region.
- No keyboard shortcuts exist for starting/stopping drawing.

**Recommendation:**
- Add `aria-label` to all icon-only buttons.
- Add an `aria-live="polite"` region that announces drawing state transitions.
- Consider keyboard shortcuts (e.g., `Escape` to cancel drawing — leaflet-draw
  supports this natively but it should also update the React state).

### 3.2 Haptic feedback setting exists but is not wired up

`SettingsPage.tsx:77-82` has a "Haptic Feedback" toggle that updates a store value,
but no code anywhere in the drawing flow reads `hapticFeedback` to trigger device
vibration. This is a broken promise to the user.

**Recommendation:** Either implement haptic feedback on draw-complete and button
presses (using `Haptics.impact()` from `@capacitor/haptics`), or remove the setting
until it's functional.

### 3.3 Hard-coded drawing colors

Line/polygon colors are hard-coded to `#16a34a` (green) in both `DrawingTools.tsx`
and `FeatureLayer.tsx`. All features look identical on the map regardless of type or
user preference. At higher feature densities this makes it difficult to distinguish
overlapping features.

**Recommendation:** At minimum, vary color by geometry type. Longer term, let users
choose a color per feature.

### 3.4 No visual distinction between the active tool button and inactive ones

When the user taps Line or Polygon, the toolbar immediately switches to the "Cancel
Drawing" view. There is no intermediate state showing which tool is selected. If the
drawing doesn't auto-start (see 1.4), the user has no visual feedback about what's
happening.

**Recommendation:** Before switching to the cancel view, briefly highlight the
selected tool button (e.g., change background to primary color) so the user sees
acknowledgment of their tap.

### 3.5 Cancel button positioning may overlap map controls

The cancel button is at `bottom-24` (`DrawingToolbar` line 179). The GPS button is at
`bottom-4` (`GpsControlButton` line 39). On small screens, these may overlap or crowd
each other, especially with safe area insets.

**Recommendation:** When in drawing mode, hide or reposition the GPS button to avoid
overlap. Or move the cancel button to a different position.

---

## 4. Minor Issues

### 4.1 Default feature name "New Point/LineString/Polygon"

Features are created with generic names (`DrawingTools.tsx:54-55`). The edit modal
opens automatically, but if the user dismisses it, they're left with unhelpful names
in the feature list. "LineString" is also developer jargon — users expect "Line."

**Recommendation:** Use user-friendly names: "New Point," "New Line," "New Polygon."
Consider auto-generating names that include a timestamp or sequence number.

### 4.2 `console.log` statements in production code

`MapView.tsx:14` and `MapView.tsx:90` contain `console.log` debug statements.

**Recommendation:** Remove or gate behind a debug flag.

### 4.3 Feature popup shows max 3 tags with "+N" overflow

`FeatureLayer.tsx:197-206` slices tags at 3. This is reasonable for popup size but
there's no way to see all tags without navigating to the detail page.

**Recommendation:** Acceptable as-is, but consider making the "+N" text clickable to
expand or navigate.

### 4.4 No loading state for "Drop Point" button

When `getCurrentPosition()` is in-flight, the button is disabled but has no spinner
or visual loading indicator (`isLoading` is checked but only disables).

**Recommendation:** Add a small spinner or pulsing animation to the button when
`isLoading` is true.

### 4.5 Map center defaults to [0, 0]

`mapStore.ts:35` defaults center to `[0, 0]` (Gulf of Guinea). On first launch,
users see open ocean until they tap the GPS button.

**Recommendation:** Auto-trigger geolocation on first launch and center the map on
the user's position. Fall back to [0, 0] only if geolocation fails.

---

## 5. Positive Aspects

These are working well and should be preserved:

- **Touch targets are 44x44px minimum** — meets WCAG AAA for mobile touch
- **GPS-integrated "Drop Point"** — the most common action (mark current location) is
  one tap, which is great for field use
- **Immediate navigation to edit** — after drawing, opening the edit form automatically
  is a smart default for a field-notebook app
- **Safe area support** — proper handling of device notches/home indicators
- **Pull-to-refresh disabled** — `overscroll-behavior-y: contain` prevents accidental
  refresh during map interaction
- **Feature filtering architecture** — the store supports per-type and per-tag filtering
  even though the UI doesn't expose it yet
- **Basemap switching** — Street/Satellite/None covers the common field-mapping needs
- **Clean visual hierarchy** — stone color palette, consistent shadows, minimal chrome

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| Critical | 4 | No geometry editing, no undo, misleading icon, fragile DOM hack |
| Major | 5 | Silent failures, no confirmation, no onboarding, dead code |
| Moderate | 5 | Accessibility, dead settings, hard-coded colors |
| Minor | 5 | Naming, debug logs, default map position |

The drawing flow covers the basics (create point/line/polygon and persist) but has
significant gaps around error recovery, post-creation editing, and user guidance.
Addressing the critical and major issues would substantially improve reliability and
usability for field users.
