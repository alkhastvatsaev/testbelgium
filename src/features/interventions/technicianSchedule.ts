import type { Intervention } from "@/features/interventions/types";

export type TechnicianTabFilter = "today" | "week" | "all";

/** Ancrage temporel pour filtres & tri (Europe/Brussels via Date locale du navigateur). */
export function getScheduleAnchor(iv: Intervention): Date {
  if (iv.scheduledDate && iv.scheduledTime) {
    const iso = `${iv.scheduledDate}T${iv.scheduledTime}:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (iv.createdAt) {
    const d = new Date(iv.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function startOfToday(ref: Date): Date {
  const n = new Date(ref);
  n.setHours(0, 0, 0, 0);
  return n;
}

function endOfToday(ref: Date): Date {
  const n = new Date(ref);
  n.setHours(23, 59, 59, 999);
  return n;
}

/** Semaine calendaire lundi → dimanche (locale). */
function startOfWeekMonday(ref: Date): Date {
  const x = new Date(ref);
  const dow = x.getDay();
  const offsetFromMonday = (dow + 6) % 7;
  x.setDate(x.getDate() - offsetFromMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(ref: Date): Date {
  const s = startOfWeekMonday(ref);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function interventionMatchesTab(iv: Intervention, tab: TechnicianTabFilter, now = new Date()): boolean {
  if (tab === "all") return true;
  const anchor = getScheduleAnchor(iv).getTime();
  if (anchor === 0) return false;
  const d = new Date(anchor);
  if (tab === "today") {
    return d >= startOfToday(now) && d <= endOfToday(now);
  }
  const ws = startOfWeekMonday(now);
  const we = endOfWeekSunday(now);
  return d >= ws && d <= we;
}

export function sortInterventionsByScheduleAsc(list: Intervention[]): Intervention[] {
  return [...list].sort((a, b) => getScheduleAnchor(a).getTime() - getScheduleAnchor(b).getTime());
}

export function formatScheduledLabel(iv: Intervention): string {
  const anchor = getScheduleAnchor(iv);
  if (anchor.getTime() === 0) {
    return iv.time?.trim() ? iv.time : "—";
  }
  return anchor.toLocaleString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatScheduledTimeOnly(iv: Intervention): string {
  if (iv.scheduledTime) return iv.scheduledTime;
  if (iv.requestedTime) return iv.requestedTime;
  if (iv.hour && iv.hour.trim() !== "") return iv.hour;
  if (iv.time && iv.time.trim() !== "") return iv.time;
  
  if (iv.urgency) return "Urgent";
  
  return "—";
}

export function interventionClientLabel(iv: Intervention): string {
  const first = iv.clientFirstName?.trim();
  const last = iv.clientLastName?.trim();
  if (first || last) {
    return [first, last].filter(Boolean).join(" ");
  }
  const n = iv.clientName?.trim();
  if (n) return n;
  const t = iv.title?.trim();
  if (t) return t;
  return "Client";
}

export function statusLabelFr(status: Intervention["status"]): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "en_route":
      return "En route";
    case "pending_needs_address":
      return "À compléter";
    case "in_progress":
      return "En cours";
    case "done":
      return "Terminé";
    case "invoiced":
      return "Facturé";
    default:
      return String(status);
  }
}

/** Teinte visuelle des tuiles « missions du jour » (ombres / dégradés). */
export type DailyMissionCardTone = "done" | "active" | "upcoming";

/**
 * Associe le libellé affiché sur une mission (voir {@link statusLabelFr}, ou mock `À venir` / `Terminé` / …)
 * à la même logique couleur que les missions générées.
 */
export function dailyMissionCardTone(statusLabel: string): DailyMissionCardTone {
  const s = statusLabel.trim();
  if (s === "Terminé" || s === "Facturé") return "done";
  if (s === "En cours" || s === "En route") return "active";
  return "upcoming";
}
