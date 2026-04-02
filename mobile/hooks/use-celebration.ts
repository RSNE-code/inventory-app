/**
 * Celebration hook — triggers CelebrationOverlay.
 * Ported from web src/hooks/use-celebration.ts.
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import React from "react";

interface CelebrationContextValue {
  isActive: boolean;
  celebrate: () => void;
  dismiss: () => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);

  const celebrate = useCallback(() => {
    setIsActive(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsActive(false);
  }, []);

  const value = useMemo(
    () => ({ isActive, celebrate, dismiss }),
    [isActive, celebrate, dismiss]
  );

  return React.createElement(
    CelebrationContext.Provider,
    { value },
    children
  );
}

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}
