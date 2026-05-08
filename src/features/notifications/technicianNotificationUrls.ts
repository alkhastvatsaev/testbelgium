import { BM_TECH_CASE_PARAM, BM_TECH_REMINDER_PARAM } from "@/features/notifications/notificationConstants";

export type TechnicianNotificationIntent =
  | { kind: "case"; caseId: string }
  | { kind: "reminder" }
  | { kind: "none" };

export function parseTechnicianNotificationSearchParams(searchParams: URLSearchParams): TechnicianNotificationIntent {
  const caseRaw = searchParams.get(BM_TECH_CASE_PARAM)?.trim();
  if (caseRaw) return { kind: "case", caseId: caseRaw };

  const reminder = searchParams.get(BM_TECH_REMINDER_PARAM);
  if (reminder === "1" || reminder === "true") return { kind: "reminder" };

  return { kind: "none" };
}
