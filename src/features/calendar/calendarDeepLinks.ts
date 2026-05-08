import type { Intervention } from "@/features/interventions/types";
import { interventionClientLabel } from "@/features/interventions/technicianSchedule";
import { getInterventionScheduledRange } from "@/features/calendar/interventionScheduleRange";

function padGoogleUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

export function buildCalendarExportPayload(iv: Intervention): {
  title: string;
  details: string;
  location: string;
  start: Date;
  end: Date;
} | null {
  const range = getInterventionScheduledRange(iv);
  if (!range) return null;

  const title = interventionClientLabel(iv);
  const details = [iv.title?.trim(), iv.problem?.trim(), `Dossier ${iv.id}`].filter(Boolean).join("\n\n");
  const location = (iv.address ?? "").trim();

  return {
    title: title.slice(0, 1024),
    details: details.slice(0, 8000),
    location: location.slice(0, 1024),
    start: range.start,
    end: range.end,
  };
}

/** Lien « Ajouter à Google Calendar » (TEMPLATE, sans OAuth). */
export function googleCalendarTemplateUrl(iv: Intervention): string | null {
  const p = buildCalendarExportPayload(iv);
  if (!p) return null;

  const dates = `${padGoogleUtc(p.start)}/${padGoogleUtc(p.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: p.title,
    dates,
    details: p.details,
    location: p.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Lien composition Outlook sur le web (compte personnel ou professionnel). */
export function outlookOfficeComposeUrl(iv: Intervention): string | null {
  const p = buildCalendarExportPayload(iv);
  if (!p) return null;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: p.title,
    body: p.details,
    location: p.location,
    startdt: p.start.toISOString(),
    enddt: p.end.toISOString(),
    al: "1",
    uid: `${Date.now()}-${iv.id}`,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}
