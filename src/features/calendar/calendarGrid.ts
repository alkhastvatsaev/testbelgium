import type { Intervention } from "@/features/interventions/types";
import { interventionScheduledLocalDayKey } from "@/features/calendar/interventionScheduleRange";


export function filterScheduledInterventions(list: Intervention[]): Intervention[] {
  return list.filter((iv) => interventionScheduledLocalDayKey(iv) !== null);
}

export function groupScheduledInterventionsByLocalDay(list: Intervention[]): Map<string, Intervention[]> {
  const map = new Map<string, Intervention[]>();
  for (const iv of list) {
    const key = interventionScheduledLocalDayKey(iv);
    if (!key) continue;
    const prev = map.get(key) ?? [];
    prev.push(iv);
    map.set(key, prev);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));
  }
  return map;
}


export function buildMonthGrid(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const pad = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function localDayKeyFromParts(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${m}-${dd}`;
}
