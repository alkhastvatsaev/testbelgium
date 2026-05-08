import {
  BM_TECH_CASE_PARAM,
  BM_TECH_REMINDER_PARAM,
} from "@/features/notifications/notificationConstants";
import { parseTechnicianNotificationSearchParams } from "@/features/notifications/technicianNotificationUrls";

describe("parseTechnicianNotificationSearchParams", () => {
  it("lit bmTechCase", () => {
    const sp = new URLSearchParams();
    sp.set(BM_TECH_CASE_PARAM, " iv-abc ");
    expect(parseTechnicianNotificationSearchParams(sp)).toEqual({ kind: "case", caseId: "iv-abc" });
  });

  it("lit bmTechReminder", () => {
    const sp = new URLSearchParams();
    sp.set(BM_TECH_REMINDER_PARAM, "1");
    expect(parseTechnicianNotificationSearchParams(sp)).toEqual({ kind: "reminder" });
  });

  it("accepte true pour bmTechReminder", () => {
    const sp = new URLSearchParams();
    sp.set(BM_TECH_REMINDER_PARAM, "true");
    expect(parseTechnicianNotificationSearchParams(sp)).toEqual({ kind: "reminder" });
  });

  it("retourne none sans params", () => {
    expect(parseTechnicianNotificationSearchParams(new URLSearchParams())).toEqual({ kind: "none" });
  });
});
