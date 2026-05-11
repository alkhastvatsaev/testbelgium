import type { Intervention } from "@/features/interventions/types";

export type TechnicianTabFilter = "today" | "week" | "all";

/** Parse Firestore Timestamp, chaîne ISO, nombre (ms) ou Date pour tri / filtres. */
export function coerceFirestoreLikeDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const sec =
      typeof v.seconds === "number"
        ? v.seconds
        : typeof v._seconds === "number"
          ? v._seconds
          : undefined;
    if (sec !== undefined) {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/**
 * Ancrage à partir des champs historiques `date` (AAAA-MM-JJ) + `hour` ou `time`
 * (ex. flux audio / carte) — avant `createdAt`, pour aligner carte et hub technicien.
 */
function anchorFromLegacyDateHour(iv: Intervention): Date | null {
  const dateStr = (iv.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const hourRaw = (iv.hour ?? "").trim() || (iv.time ?? "").trim();
  if (!hourRaw || /^maintenant$/i.test(hourRaw)) {
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hourRaw);
  if (m) {
    const hh = m[1].padStart(2, "0");
    const mm = m[2];
    const d = new Date(`${dateStr}T${hh}:${mm}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ancrage temporel pour filtres & tri (Europe/Brussels via Date locale du navigateur). */
export function getScheduleAnchor(iv: Intervention): Date {
  if (iv.scheduledDate && iv.scheduledTime) {
    const iso = `${iv.scheduledDate}T${iv.scheduledTime}:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (iv.requestedDate && iv.requestedTime) {
    const iso = `${iv.requestedDate}T${iv.requestedTime}:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (iv.requestedDate) {
    const iso = `${iv.requestedDate}T12:00:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const legacy = anchorFromLegacyDateHour(iv);
  if (legacy) return legacy;
  const fromCreated = coerceFirestoreLikeDate(iv.createdAt);
  if (fromCreated) return fromCreated;
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

/** AAAA-MM-JJ dans le fuseau local (aligné calendrier hub technicien). */
export function localCalendarYmd(ref: Date): string {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  const d = String(ref.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** HH:mm dans le fuseau local. */
export function localCalendarHm(ref: Date): string {
  const hh = String(ref.getHours()).padStart(2, "0");
  const mm = String(ref.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeTimeHm(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(input.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

/**
 * Lorsqu’IVANA confirme / envoie au technicien : figer une planification lisible par
 * {@link getScheduleAnchor} pour le filtre « jour » du hub (évite de rester sur
 * `createdAt` = jour de soumission si la validation a lieu plus tard).
 */
export function scheduledFieldsWhenReleasingToTechnician(
  iv: Pick<Intervention, "requestedDate" | "requestedTime" | "scheduledDate" | "scheduledTime">,
  now = new Date(),
): { scheduledDate: string; scheduledTime: string } {
  const schD = iv.scheduledDate?.trim();
  const schT = normalizeTimeHm(iv.scheduledTime);
  if (schD && /^\d{4}-\d{2}-\d{2}$/.test(schD)) {
    return { scheduledDate: schD, scheduledTime: schT ?? "12:00" };
  }
  const reqD = iv.requestedDate?.trim();
  const reqT = normalizeTimeHm(iv.requestedTime);
  if (reqD && /^\d{4}-\d{2}-\d{2}$/.test(reqD)) {
    return { scheduledDate: reqD, scheduledTime: reqT ?? "12:00" };
  }
  return {
    scheduledDate: localCalendarYmd(now),
    scheduledTime: localCalendarHm(now),
  };
}

/**
 * Dossier encore uniquement dans le file IVANA « Demandes » (soumission client),
 * avant validation / envoi terrain. {@link isInterventionReleasedToTechnicianField} est l’inverse.
 */
export function isInterventionPendingBackOfficeIntake(iv: Intervention): boolean {
  return iv.status === "pending" || iv.status === "pending_needs_address";
}

/** Visible sur le hub technicien : après passage back-office (ex. statut ≠ pending). */
export function isInterventionReleasedToTechnicianField(iv: Intervention): boolean {
  return !isInterventionPendingBackOfficeIntake(iv);
}

export function formatScheduledLabel(iv: Intervention): string {
  const anchor = getScheduleAnchor(iv);
  if (anchor.getTime() === 0) {
    return iv.time?.trim() ? iv.time : "—";
  }
  // Locale is applied at the call site when needed; default browser locale here.
  return anchor.toLocaleString(undefined, {
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
  
  if (iv.urgency) return "common.urgent";
  
  return "common.dash";
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
  return "";
}

export function statusLabelKey(status: Intervention["status"]): string {
  switch (status) {
    case "pending":
      return "status.pending";
    case "en_route":
      return "status.en_route";
    case "pending_needs_address":
      return "status.pending_needs_address";
    case "in_progress":
      return "status.in_progress";
    case "done":
      return "status.done";
    case "invoiced":
      return "status.invoiced";
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
export function dailyMissionCardToneFromStatus(status: Intervention["status"] | null | undefined): DailyMissionCardTone {
  if (!status) return "upcoming";
  if (status === "done" || status === "invoiced") return "done";
  if (status === "en_route" || status === "in_progress") return "active";
  return "upcoming";
}
