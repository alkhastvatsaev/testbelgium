import type { Intervention } from "@/features/interventions/types";
import { getScheduleAnchor } from "@/features/interventions/technicianSchedule";
import { BACKOFFICE_REVENUE_ESTIMATE_TTC_EUR } from "@/features/backoffice/backofficeConstants";
import { interventionBackofficeBucket } from "@/features/backoffice/backofficeBuckets";
import {
  dayKeyBrusselsFromMs,
  todayKeyBrussels,
  unknownTimestampToMs,
} from "@/features/backoffice/timeHelpers";

export type TodayActivitySummary = {
  completedCount: number;
  invoicedCount: number;
  revenueEstimateEuros: number;
  newRequestsCount: number;
};

function completionDayKey(iv: Intervention): string | null {
  const ms =
    unknownTimestampToMs(iv.completedAt as unknown) ??
    unknownTimestampToMs(iv.invoicedAt as unknown);
  if (ms != null) return dayKeyBrusselsFromMs(ms);
  const b = interventionBackofficeBucket(iv.status);
  if (b === "done" || b === "invoiced") {
    const a = getScheduleAnchor(iv);
    if (a.getTime() !== 0) return dayKeyBrusselsFromMs(a.getTime());
  }
  return null;
}

function invoicedDayKey(iv: Intervention): string | null {
  const ms = unknownTimestampToMs(iv.invoicedAt as unknown);
  if (ms != null) return dayKeyBrusselsFromMs(ms);
  if (iv.status === "invoiced") return completionDayKey(iv);
  return null;
}

function createdDayKey(iv: Intervention): string | null {
  const ms = unknownTimestampToMs(iv.createdAt as unknown);
  if (ms != null) return dayKeyBrusselsFromMs(ms);
  const a = getScheduleAnchor(iv);
  if (a.getTime() !== 0) return dayKeyBrusselsFromMs(a.getTime());
  return null;
}

/** Agrégats « activité du jour » (jour civil Brussels). */
export function computeTodayActivitySummary(
  interventions: Intervention[],
  now = new Date(),
): TodayActivitySummary {
  const today = todayKeyBrussels(now);
  let completedCount = 0;
  let invoicedCount = 0;
  let newRequestsCount = 0;

  for (const iv of interventions) {
    const ck = completionDayKey(iv);
    const b = interventionBackofficeBucket(iv.status);
    if ((b === "done" || b === "invoiced") && ck === today) completedCount += 1;

    const ik = invoicedDayKey(iv);
    if (ik === today) invoicedCount += 1;

    const nk = createdDayKey(iv);
    if (nk === today) newRequestsCount += 1;
  }

  const revenueEstimateEuros = Math.round(invoicedCount * BACKOFFICE_REVENUE_ESTIMATE_TTC_EUR * 100) / 100;

  return {
    completedCount,
    invoicedCount,
    revenueEstimateEuros,
    newRequestsCount,
  };
}
