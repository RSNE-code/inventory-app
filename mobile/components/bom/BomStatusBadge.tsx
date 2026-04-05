/**
 * BomStatusBadge — status pill matching web's bom-status-badge.tsx.
 * PENDING_REVIEW and IN_PROGRESS get a pulsing dot animation.
 */
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Badge } from "@/components/ui/Badge";

const STATUS_MAP: Record<string, { label: string; variant: "gray" | "orange" | "blue" | "yellow" | "green" | "red"; pulse: boolean }> = {
  DRAFT: { label: "Draft", variant: "gray", pulse: false },
  PENDING_REVIEW: { label: "Pending Review", variant: "orange", pulse: true },
  APPROVED: { label: "Approved", variant: "blue", pulse: false },
  IN_PROGRESS: { label: "In Progress", variant: "yellow", pulse: true },
  COMPLETED: { label: "Completed", variant: "green", pulse: false },
  CANCELLED: { label: "Cancelled", variant: "red", pulse: false },
};

export function BomStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (config.pulse) {
      opacity.value = withRepeat(withTiming(0.4, { duration: 1200 }), -1, true);
    } else {
      opacity.value = 1;
    }
  }, [config.pulse]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: config.pulse ? opacity.value : 1,
  }));

  if (config.pulse) {
    return (
      <Animated.View style={animStyle}>
        <Badge label={config.label} variant={config.variant} />
      </Animated.View>
    );
  }

  return <Badge label={config.label} variant={config.variant} />;
}
