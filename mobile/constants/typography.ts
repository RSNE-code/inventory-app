/**
 * Typography scale — Figtree font family.
 * Tight scale (12→14→16→18→24) for information-dense productivity UI.
 *
 * Font names registered in _layout.tsx:
 *   "Figtree" → 400 Regular
 *   "Figtree-Medium" → 500 Medium
 *   "Figtree-SemiBold" → 600 SemiBold
 *   "Figtree-Bold" → 700 Bold
 */

/** Base font family name (400 weight) */
export const FONT_FAMILY = "Figtree" as const;

/** Weight-specific font family names for React Native */
export const fontFamily = {
  regular: "Figtree" as const,
  medium: "Figtree-Medium" as const,
  semibold: "Figtree-SemiBold" as const,
  bold: "Figtree-Bold" as const,
};

/** Font weights as string literals */
export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

/**
 * Type roles — every piece of text maps to exactly one role.
 * Use these as spread objects in StyleSheet: { ...type.pageTitle }
 */
export const type = {
  pageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },

  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
  },

  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
  },

  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },

  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },

  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
  },
} as const;
