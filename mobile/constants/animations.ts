/**
 * Animation constants for Reanimated.
 * Spring configs match web's CSS cubic-bezier curves.
 */
import { WithSpringConfig, WithTimingConfig, Easing } from "react-native-reanimated";

/** Spring config matching web's ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) */
export const SPRING_CONFIG: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

/** Gentler spring for larger movements */
export const SPRING_GENTLE: WithSpringConfig = {
  damping: 20,
  stiffness: 120,
  mass: 1,
};

/** Snappy spring for small interactions (tab switches, toggles) */
export const SPRING_SNAPPY: WithSpringConfig = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

/** Duration tokens matching web's --duration-* */
export const duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  celebration: 1000,
} as const;

/** Timing config matching web's ease-out: cubic-bezier(0.16, 1, 0.3, 1) */
export const EASE_OUT_CONFIG: WithTimingConfig = {
  duration: duration.normal,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

/** Timing config for fast transitions */
export const EASE_FAST_CONFIG: WithTimingConfig = {
  duration: duration.fast,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

/** Stagger delay between items in list animations */
export const STAGGER_DELAY = 50;

/** Card entrance animation delay base */
export const CARD_ENTER_DELAY = 60;
