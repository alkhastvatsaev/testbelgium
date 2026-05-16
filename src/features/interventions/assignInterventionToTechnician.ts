import type { Intervention } from "@/features/interventions/types";
import { scheduledFieldsWhenReleasingToTechnician } from "@/features/interventions/technicianSchedule";

export type AssignInterventionToTechnicianUpdate = {
  status: "assigned";
  assignedTechnicianUid: string;
  scheduledDate: string;
  scheduledTime: string;
};

/** Patch Firestore quand IVANA assigne un dossier au technicien (statut `assigned`). */
export function buildAssignInterventionToTechnicianUpdate(
  row:
    | Pick<
        Intervention,
        "requestedDate" | "requestedTime" | "scheduledDate" | "scheduledTime"
      >
    | null
    | undefined,
  assignedTechnicianUid: string,
  now = new Date(),
): AssignInterventionToTechnicianUpdate {
  const schedule = scheduledFieldsWhenReleasingToTechnician(row ?? {}, now);
  return {
    status: "assigned",
    assignedTechnicianUid,
    scheduledDate: schedule.scheduledDate,
    scheduledTime: schedule.scheduledTime,
  };
}
