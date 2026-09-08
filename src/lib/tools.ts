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

export function normalizeToolStatus(
  status: string | null | undefined,
): ToolStatus {
  if (status === "OK" || status === "IN_REPAIR" || status === "LOST") {
    return status;
  }
  return "OK";
}

export function toolStatusLabel(status: string | null | undefined): string {
  return TOOL_STATUS_LABELS[normalizeToolStatus(status)];
}

export function toolMovementLabel(kind: string): string {
  return (
    TOOL_MOVEMENT_LABELS[kind as ToolMovementKind] ?? kind.replaceAll("_", " ")
  );
}

export function toolStatusBadgeVariant(
  status: string | null | undefined,
): "success" | "secondary" | "destructive" {
  const normalized = normalizeToolStatus(status);
  if (normalized === "OK") return "success";
  if (normalized === "IN_REPAIR") return "secondary";
  return "destructive";
}
