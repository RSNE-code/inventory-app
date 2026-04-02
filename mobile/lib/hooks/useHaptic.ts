/**
 * Haptic feedback helpers — consistent haptics across the app.
 */
import * as Haptics from "expo-haptics";

/** Light tap — tab switches, chip selects */
export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — button presses, card taps */
export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy tap — destructive actions, swipe delete */
export function hapticHeavy() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Success — completed actions, saved successfully */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Error — failed actions */
export function hapticError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Warning — attention needed */
export function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
