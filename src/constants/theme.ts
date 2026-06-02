/**
 * App-wide colors, spacing, and the category color palette.
 */

export const Colors = {
  // Core UI
  background: '#FFFFFF',
  surface: '#F4F4F5',
  text: '#18181B',
  textSecondary: '#71717A',
  textInverse: '#FFFFFF',
  border: '#E4E4E7',

  // Brand / actions
  primary: '#2E7D32', // green – land/outdoors
  primaryDark: '#1B5E20',
  danger: '#DC2626',

  // Map overlays
  trackingStroke: '#FF6D00',
  overlayBackground: 'rgba(24, 24, 27, 0.85)',
} as const;

/** Palette users can pick from when creating categories. */
export const CategoryColors = [
  '#2E7D32', // green
  '#1565C0', // blue
  '#E65100', // orange
  '#6A1B9A', // purple
  '#C62828', // red
  '#00838F', // teal
  '#F9A825', // yellow
  '#4E342E', // brown
] as const;

/** Color used for features with no category. */
export const UncategorizedColor = '#607D8B';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;
