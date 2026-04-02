/**
 * Typography scale — Figtree variable font.
 * Tight scale (12→14→16→18→24) for information-dense productivity UI.
 */

/** Font family constant — loaded via @expo-google-fonts/figtree */
export const FONT_FAMILY = "Figtree" as const;

/** Font weights as string literals (required by RN fontWeight prop) */
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
  /** Page title: one per screen, top of page */
  pageTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },

  /** Section title: group headings within a page */
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.semibold,
    fontSize: 18,
    lineHeight: 24,
  },

  /** Card title: title at top of each card */
  cardTitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.semibold,
    fontSize: 16,
    lineHeight: 22,
  },

  /** Subtitle: supporting text below a title */
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  /** Body: regular paragraph and content text */
  body: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.regular,
    fontSize: 14,
    lineHeight: 20,
  },

  /** Body medium: slightly bolder body text */
  bodyMedium: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  /** Caption: timestamps, metadata, helper text */
  caption: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  /** Label: form labels, overlines, category tags */
  label: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },

  /** Large display number (e.g., inventory value on dashboard) */
  displayLarge: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  /** Tab bar label */
  tabLabel: {
    fontFamily: FONT_FAMILY,
    fontWeight: fontWeight.semibold,
    fontSize: 11,
    lineHeight: 14,
  },
} as const;
