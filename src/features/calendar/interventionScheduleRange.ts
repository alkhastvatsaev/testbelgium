import type { Intervention } from "@/features/interventions/types";
import { CALENDAR_DEFAULT_EVENT_DURATION_MS } from "@/features/calendar/calendarConstants";


export function getInterventionScheduledRange(iv: Intervention): { start: Date; end: Date } | null {
  const d = (iv.scheduledDate ?? "").trim();
  const t = (iv.scheduledTime ?? "").trim();
  if (!d || !t) return null;
  const iso = `${d}T${t}:00`;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + CALENDAR_DEFAULT_EVENT_DURATION_MS);
  return { start, end };
}


export function interventionScheduledLocalDayKey(iv: Intervention): string | null {
  const r = getInterventionScheduledRange(iv);
  if (!r) return null;
  const x = r.start;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function interventionHasScheduledSlot(iv: Intervention): boolean {
  return getInterventionScheduledRange(iv) !== null;
}
