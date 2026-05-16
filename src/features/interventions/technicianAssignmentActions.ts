import { devUiPreviewEnabled, DEMO_TECHNICIAN_UID } from "@/core/config/devUiPreview";
import type { Intervention } from "@/features/interventions/types";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";

/**
 * UID utilisé pour filtrer / accepter les missions sur la page technicien.
 * En dev, le hub MANSOUR suit toujours le technicien par défaut back-office (pas l’UID IVANA).
 */
export function getTechnicianAssignmentUid(
  authUid: string | null | undefined,
): string | null {
  if (devUiPreviewEnabled) {
    return getDefaultAssignedTechnicianUid();
  }
  const uid = (authUid ?? "").trim();
  return uid || null;
}

/** L’intervention cible ce technicien (UID direct ou technicien par défaut back-office). */
export function matchesAssignedTechnician(
  iv: Pick<Intervention, "assignedTechnicianUid">,
  technicianUid: string | null | undefined,
): boolean {
  const uid = (technicianUid ?? "").trim();
  const assigned = (iv.assignedTechnicianUid ?? "").trim();
  if (!uid || !assigned) return false;
  if (assigned === uid) return true;
  if (devUiPreviewEnabled && assigned === getDefaultAssignedTechnicianUid()) {
    return true;
  }
  const defaultUid = getDefaultAssignedTechnicianUid();
  return (
    assigned === defaultUid &&
    (uid === DEMO_TECHNICIAN_UID || uid === defaultUid)
  );
}

/** IVANA vient d’assigner — le technicien doit accepter ou refuser. */
export function isTechnicianAssignmentAwaitingResponse(
  iv: Pick<
    Intervention,
    "status" | "assignedTechnicianUid" | "technicianAcceptedAt"
  >,
  technicianUid: string | null | undefined,
): boolean {
  if (!matchesAssignedTechnician(iv, technicianUid)) return false;
  if (iv.status === "assigned") return true;
  /** Dossiers assignés avant le statut `assigned` (migration). */
  if (iv.status === "in_progress" && !iv.technicianAcceptedAt) return true;
  return false;
}

export function acceptTechnicianAssignmentPatch(now = new Date()): Record<string, unknown> {
  return {
    status: "en_route" as const,
    technicianAcceptedAt: now.toISOString(),
  };
}

export function declineTechnicianAssignmentPatch(
  declinedByUid: string,
  now = new Date(),
): Record<string, unknown> {
  return {
    status: "pending" as const,
    assignedTechnicianUid: null,
    technicianDeclinedAt: now.toISOString(),
    technicianDeclinedByUid: declinedByUid,
  };
}
