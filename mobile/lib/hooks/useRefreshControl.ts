/**
 * useRefreshControl — pull-to-refresh with haptic feedback.
 */
import { useState, useCallback } from "react";
import { hapticLight } from "./useHaptic";

export function useRefreshControl(refetchFn: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticLight();
    await refetchFn();
    setRefreshing(false);
  }, [refetchFn]);

  return { refreshing, onRefresh };
}
