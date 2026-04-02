/**
 * BomStatusBadge — status pill matching web's bom-status-badge.tsx.
 */
import { Badge } from "@/components/ui/Badge";
import type { BomStatus } from "@/types/api";

const STATUS_MAP: Record<string, { label: string; variant: "gray" | "orange" | "blue" | "yellow" | "green" | "red" }> = {
  DRAFT: { label: "Draft", variant: "gray" },
  PENDING_REVIEW: { label: "Pending Review", variant: "orange" },
  APPROVED: { label: "Approved", variant: "blue" },
  IN_PROGRESS: { label: "In Progress", variant: "yellow" },
  COMPLETED: { label: "Completed", variant: "green" },
  CANCELLED: { label: "Cancelled", variant: "red" },
};

export function BomStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
  return <Badge label={config.label} variant={config.variant} />;
}
