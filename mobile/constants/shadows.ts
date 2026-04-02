/**
 * Shadow definitions — platform-specific.
 * Matches web's shadow-brand / shadow-brand-md / shadow-brand-lg.
 */
import { Platform, ViewStyle } from "react-native";

function shadow(
  offsetY: number,
  radius: number,
  opacity: number
): ViewStyle {
  if (Platform.OS === "ios") {
    return {
      shadowColor: "#0B1D3A",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  }
  return { elevation: Math.round(radius * 0.8) };
}

/** Light card shadow — matches web's shadow-brand */
export const shadowBrand = shadow(1, 3, 0.06);

/** Medium card shadow — matches web's shadow-brand-md */
export const shadowBrandMd = shadow(4, 12, 0.08);

/** Large card shadow — matches web's shadow-brand-lg */
export const shadowBrandLg = shadow(8, 24, 0.12);
