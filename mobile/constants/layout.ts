/**
 * Layout constants — spacing, radii, touch targets, breakpoints.
 * Every number in the app comes from here. No eyeballing.
 */

/** Spacing scale (4px base) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

/** Border radii — matches web's --radius system */
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  "2xl": 18,
  full: 9999,
} as const;

/** Touch target minimums (construction workers with gloves) */
export const touchTarget = {
  phone: 44,
  tablet: 48,
} as const;

/** Card accent bar width */
export const ACCENT_BAR_WIDTH = 4;

/** Bottom tab bar height (including safe area) */
export const TAB_BAR_HEIGHT = 64;

/** Header height */
export const HEADER_HEIGHT = 56;

/** iPad breakpoint (points) */
export const TABLET_BREAKPOINT = 768;

/** Max content width for forms on iPad */
export const FORM_MAX_WIDTH = 600;

/** Max content width for settings on iPad */
export const SETTINGS_MAX_WIDTH = 500;

/** Split view proportions on iPad */
export const SPLIT_VIEW = {
  masterRatio: 0.38,
  detailRatio: 0.62,
} as const;
