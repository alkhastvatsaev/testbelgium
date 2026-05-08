import type { Intervention } from "@/features/interventions/types";
import { googleCalendarTemplateUrl, outlookOfficeComposeUrl } from "@/features/calendar/calendarDeepLinks";

const scheduledIv = (): Intervention => ({
  id: "doc1",
  title: "Serrure",
  address: "Rue Test 1",
  time: "",
  status: "pending",
  location: { lat: 0, lng: 0 },
  scheduledDate: "2026-06-15",
  scheduledTime: "10:00",
  problem: "Porte bloquée",
});

describe("calendarDeepLinks", () => {
  it("googleCalendarTemplateUrl pointe vers calendar.google.com avec action TEMPLATE", () => {
    const u = googleCalendarTemplateUrl(scheduledIv());
    expect(u).toBeTruthy();
    expect(u!).toMatch(/calendar\.google\.com/);
    expect(u!).toMatch(/action=TEMPLATE/);
  });

  it("outlookOfficeComposeUrl pointe vers outlook.office.com", () => {
    const u = outlookOfficeComposeUrl(scheduledIv());
    expect(u).toBeTruthy();
    expect(u!).toMatch(/outlook\.office\.com/);
  });

  it("retourne null sans créneau", () => {
    const iv: Intervention = {
      ...scheduledIv(),
      scheduledDate: "",
      scheduledTime: "",
    };
    expect(googleCalendarTemplateUrl(iv)).toBeNull();
    expect(outlookOfficeComposeUrl(iv)).toBeNull();
  });
});
