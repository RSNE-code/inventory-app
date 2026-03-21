"use client"

/**
 * Lightweight haptic feedback hook.
 * Uses Capacitor Haptics plugin when available (native iOS/Android),
 * falls back to navigator.vibrate on Android web, no-op on desktop.
 */

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error"

// Vibration durations in ms for web fallback
const VIBRATE_MAP: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [30, 20, 30, 20, 30],
}

function triggerHaptic(style: HapticStyle) {
  // Try Capacitor Haptics first (native iOS/Android)
  try {
    const capacitorHaptics = (window as unknown as Record<string, unknown>).Capacitor as
      | { Plugins?: { Haptics?: { impact?: (opts: { style: string }) => void; notification?: (opts: { type: string }) => void } } }
      | undefined

    if (capacitorHaptics?.Plugins?.Haptics) {
      const haptics = capacitorHaptics.Plugins.Haptics
      if (style === "success" || style === "warning" || style === "error") {
        haptics.notification?.({ type: style.toUpperCase() })
      } else {
        haptics.impact?.({ style: style.toUpperCase() })
      }
      return
    }
  } catch {
    // Capacitor not available
  }

  // Web fallback — navigator.vibrate (Android Chrome only)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(VIBRATE_MAP[style])
  }
}

export function useHaptic() {
  return {
    light: () => triggerHaptic("light"),
    medium: () => triggerHaptic("medium"),
    heavy: () => triggerHaptic("heavy"),
    success: () => triggerHaptic("success"),
    warning: () => triggerHaptic("warning"),
    error: () => triggerHaptic("error"),
    tap: () => triggerHaptic("light"),
    impact: () => triggerHaptic("medium"),
  }
}
