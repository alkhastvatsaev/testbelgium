import type { Intervention } from "@/features/interventions/types";
import { interventionClientLabel } from "@/features/interventions/technicianSchedule";
import { getInterventionScheduledRange } from "@/features/calendar/interventionScheduleRange";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}


export function formatIcsUtc(dt: Date): string {
  return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}T${pad2(dt.getUTCHours())}${pad2(dt.getUTCMinutes())}${pad2(dt.getUTCSeconds())}Z`;
}

export function escapeIcsText(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  let out = "";
  let rest = line;
  while (rest.length > 75) {
    out += `${rest.slice(0, 75)}\r\n `;
    rest = rest.slice(75);
  }
  out += rest;
  return out;
}

export function buildInterventionIcs(iv: Intervention, uidSuffix = "belmap"): string {
  const range = getInterventionScheduledRange(iv);
  if (!range) return "";

  const title = interventionClientLabel(iv).slice(0, 200);
  const summary = escapeIcsText(iv.title?.trim() ? iv.title.trim() : title);
  const location = escapeIcsText((iv.address ?? "").trim());
  const descParts = [
    iv.problem?.trim(),
    iv.phone?.trim() ? `Tél: ${iv.phone.trim()}` : "",
    `Dossier: ${iv.id}`,
  ].filter(Boolean);
  const description = escapeIcsText(descParts.join("\\n"));

  const dtStamp = formatIcsUtc(new Date());
  const dtStart = formatIcsUtc(range.start);
  const dtEnd = formatIcsUtc(range.end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Belmap//Intervention//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(iv.id)}@${uidSuffix}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map((l) => foldIcsLine(l)).join("\r\n") + "\r\n";
}
