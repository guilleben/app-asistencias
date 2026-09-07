import type { ToolMovementKind, ToolStatus } from "@/generated/prisma/client";

export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  OK: "OK",
  IN_REPAIR: "En reparación",
  LOST: "Extraviada",
};

export const TOOL_MOVEMENT_LABELS: Record<ToolMovementKind, string> = {
  CREATED: "Alta",
  UPDATED: "Actualización",
  DELETED: "Baja",
  TRANSFER_OUT: "Salida",
  TRANSFER_IN: "Ingreso",
  STATUS_CHANGED: "Cambio de estado",
};

export type ToolStatusValue = ToolStatus;

export function toolStatusBadgeVariant(
  status: ToolStatus,
): "success" | "secondary" | "destructive" {
  if (status === "OK") return "success";
  if (status === "IN_REPAIR") return "secondary";
  return "destructive";
}
