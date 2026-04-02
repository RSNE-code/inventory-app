/**
 * Device type detection — phone vs tablet.
 * Uses screen width to determine layout mode.
 */
import { useWindowDimensions } from "react-native";
import { TABLET_BREAKPOINT } from "@/constants/layout";

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

/** Returns responsive column count based on screen width */
export function useColumns(phoneColumns = 1, tabletColumns = 2): number {
  const isTablet = useIsTablet();
  return isTablet ? tabletColumns : phoneColumns;
}

/** Returns responsive touch target size */
export function useTouchTarget(): number {
  const isTablet = useIsTablet();
  return isTablet ? 48 : 44;
}
