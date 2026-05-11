import type { Intervention } from "@/features/interventions/types";
import { unknownTimestampToMs } from "@/features/backoffice/timeHelpers";

export type InterventionHistoryEntry = {
  id: string;
  label: string;
  detail?: string;
  atMs: number | null;
};

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("fr-BE", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}


export function buildInterventionHistory(iv: Intervention): InterventionHistoryEntry[] {
  const rows: InterventionHistoryEntry[] = [];

  const createdMs = unknownTimestampToMs(iv.createdAt as unknown);
  rows.push({
    id: "created",
    label: "Demande créée",
    detail: createdMs != null ? formatWhen(createdMs) : undefined,
    atMs: createdMs,
  });

  const uid = (iv.assignedTechnicianUid ?? "").trim();
  if (uid) {
    rows.push({
      id: "assigned",
      label: "Technicien assigné",
      detail: uid,
      atMs: null,
    });
  }

  const completedMs = unknownTimestampToMs(iv.completedAt as unknown);
  const hasLifecycleBeyondPending =
    iv.status === "in_progress" || iv.status === "done" || iv.status === "invoiced";
  if (completedMs != null || hasLifecycleBeyondPending) {
    let detail: string | undefined;
    if (completedMs != null) detail = formatWhen(completedMs);
    else if (iv.status === "in_progress") detail = "Intervention en cours";
    rows.push({
      id: "completed",
      label: "Fin d’intervention",
      detail,
      atMs: completedMs,
    });
  }

  const invoicedMs = unknownTimestampToMs(iv.invoicedAt as unknown);
  if (invoicedMs != null || iv.status === "invoiced") {
    let detail: string | undefined;
    if (invoicedMs != null) detail = formatWhen(invoicedMs);
    if (iv.invoicePdfUrl) detail = detail ? `${detail} · PDF émis` : "PDF émis";
    rows.push({
      id: "invoice",
      label: "Facturé",
      detail,
      atMs: invoicedMs,
    });
  }

  return rows;
}
