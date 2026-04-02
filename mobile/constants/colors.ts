/**
 * RSNE Brand Colors — single source of truth for the native app.
 * Values sourced from the web app's globals.css @theme block.
 */
export const colors = {
  // ── Brand ──
  navy: "#0B1D3A",
  navyLight: "#132C52",
  navyDark: "#071428",

  brandBlue: "#2E7DBA",
  brandBlueBright: "#3A8FD4",

  brandOrange: "#E8792B",
  brandOrangeHover: "#D06820",

  // ── Surfaces ──
  background: "#FFFFFF",
  card: "#FFFFFF",
  surfaceSecondary: "#F4F6F8",

  // ── Text ──
  textPrimary: "#0B1D3A",
  textSecondary: "#4A5B6E",
  textMuted: "#6B7F96",
  textInverse: "#FFFFFF",

  // ── Borders ──
  border: "#E2E6EB",
  borderLight: "#F4F6F8",

  // ── Status ──
  statusGreen: "#22C55E",
  statusGreenBg: "rgba(34, 197, 94, 0.15)",
  statusRed: "#EF4444",
  statusRedBg: "rgba(239, 68, 68, 0.15)",
  statusYellow: "#EAB308",
  statusYellowBg: "rgba(234, 179, 8, 0.15)",
  statusBlue: "#2E7DBA",
  statusBlueBg: "rgba(46, 125, 186, 0.15)",
  statusGray: "#6B7F96",
  statusGrayBg: "rgba(107, 127, 150, 0.15)",

  // ── Semantic ──
  jobBadgeBg: "rgba(11, 29, 58, 0.08)",
  errorBorder: "rgba(239, 68, 68, 0.2)",

  // ── Tab Bar ──
  tabActive: "#2E7DBA",
  tabInactive: "#6B7F96",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#E2E6EB",

  // ── Overlays ──
  overlayLight: "rgba(11, 29, 58, 0.04)",
  overlayMedium: "rgba(11, 29, 58, 0.08)",
  overlayDark: "rgba(11, 29, 58, 0.5)",
} as const;
