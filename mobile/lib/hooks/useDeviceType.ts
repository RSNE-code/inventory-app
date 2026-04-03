/**
 * Device type detection — phone vs tablet.
 * Uses screen width to determine layout mode.
 */
import { useWindowDimensions } from "react-native";
import { TABLET_BREAKPOINT, spacing } from "@/constants/layout";

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

/** Returns responsive spacing — more generous on iPad */
export function useResponsiveSpacing() {
  const isTablet = useIsTablet();
  return {
    screenPadding: isTablet ? spacing["2xl"] : spacing.lg,
    cardPadding: isTablet ? spacing.xl : spacing.lg,
    sectionGap: isTablet ? spacing.xl : spacing.lg,
  };
}
