import type { Intervention } from "@/features/interventions/types";
import { getScheduleAnchor, interventionMatchesTab } from "@/features/interventions/technicianSchedule";
import { unknownTimestampToMs } from "@/features/backoffice/timeHelpers";
import {
  type BackofficeBucket,
  interventionMatchesStatusBucket,
} from "@/features/backoffice/backofficeBuckets";

export type ActivityWindow = "all" | "today" | "week" | "custom";

export type BackofficeViewFilters = {
  activityWindow: ActivityWindow;
  /** yyyy-mm-dd (Europe/Brussels jour planifié / création) */
  dateFrom: string;
  dateTo: string;
  technicianUid: string;
  statusBucket: "" | BackofficeBucket;
};

export const defaultBackofficeViewFilters = (): BackofficeViewFilters => ({
  activityWindow: "all",
  dateFrom: "",
  dateTo: "",
  technicianUid: "",
  statusBucket: "",
});

/** Jour planifié Brussels (ancrage intervention), ou null si inconnu. */
export function ivPlanningDayKeyBrussels(iv: Intervention): string | null {
  const a = getScheduleAnchor(iv);
  if (a.getTime() === 0) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(a);
}

export function applyBackofficeFilters(
  list: Intervention[],
  filters: BackofficeViewFilters,
  now = new Date(),
): Intervention[] {
  return list.filter((iv) => {
    if (filters.statusBucket) {
      if (!interventionMatchesStatusBucket(iv, filters.statusBucket)) return false;
    }
    if (filters.technicianUid.trim()) {
      if ((iv.assignedTechnicianUid ?? "").trim() !== filters.technicianUid.trim()) return false;
    }

    switch (filters.activityWindow) {
      case "all":
        break;
      case "today":
        if (!interventionMatchesTab(iv, "today", now)) return false;
        break;
      case "week":
        if (!interventionMatchesTab(iv, "week", now)) return false;
        break;
      case "custom": {
        const dk = ivPlanningDayKeyBrussels(iv);
        const from = filters.dateFrom.trim();
        const to = filters.dateTo.trim();
        if (!from && !to) break;
        if (dk === null) return false;
        if (from && dk < from) return false;
        if (to && dk > to) return false;
        break;
      }
      default:
        break;
    }

    return true;
  });
}

/** UIDs assignés distincts pour le select technicien. */
export function uniqueAssignedTechnicianUids(list: Intervention[]): string[] {
  const s = new Set<string>();
  for (const iv of list) {
    const u = (iv.assignedTechnicianUid ?? "").trim();
    if (u) s.add(u);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

/** Tri récent → ancien pour le tableau back-office. */
export function sortBackofficeRowsDesc(list: Intervention[]): Intervention[] {
  return [...list].sort((a, b) => {
    const tb = unknownTimestampToMs(b.createdAt as unknown) ?? getScheduleAnchor(b).getTime();
    const ta = unknownTimestampToMs(a.createdAt as unknown) ?? getScheduleAnchor(a).getTime();
    return tb - ta;
  });
}
