/**
 * useToast — React Context provider + hook for the Toast notification system.
 *
 * Usage:
 *   Wrap your root layout with <ToastProvider>.
 *   Call showToast("Saved!", "success") from any child component.
 *
 * Only one toast is displayed at a time. Queued toasts appear after the
 * current one is dismissed (3 s default, 5 s for errors).
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastVariant } from "@/components/shared/Toast";

/* ── Types ── */

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

/* ── Durations (ms) ── */

const DURATION_DEFAULT = 3000;
const DURATION_ERROR = 5000;

/* ── Context ── */

const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Provider ── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastEntry | null>(null);
  const queue = useRef<ToastEntry[]>([]);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (queue.current.length === 0) {
      setCurrent(null);
      return;
    }
    const next = queue.current.shift()!;
    setCurrent(next);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    showNext();
  }, [showNext]);

  // Auto-dismiss timer whenever `current` changes
  useEffect(() => {
    if (!current) return;
    const duration =
      current.variant === "error" ? DURATION_ERROR : DURATION_DEFAULT;
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current, dismiss]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const entry: ToastEntry = { id: nextId.current++, message, variant };
      if (current === null && queue.current.length === 0) {
        setCurrent(entry);
      } else {
        queue.current.push(entry);
      }
    },
    [current]
  );

  return createElement(
    ToastContext.Provider,
    { value: { showToast } },
    children,
    current
      ? createElement(Toast, {
          key: current.id,
          message: current.message,
          variant: current.variant,
        })
      : null
  );
}

/* ── Hook ── */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
