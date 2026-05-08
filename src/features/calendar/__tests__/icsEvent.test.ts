import type { Intervention } from "@/features/interventions/types";
import { buildInterventionIcs } from "@/features/calendar/icsEvent";

describe("buildInterventionIcs", () => {
  it("produit un calendrier avec un VEVENT", () => {
    const iv: Intervention = {
      id: "abc123",
      title: "Test",
      address: "Rue X",
      time: "",
      status: "pending",
      location: { lat: 0, lng: 0 },
      scheduledDate: "2026-07-01",
      scheduledTime: "09:30",
      problem: "Blocage",
    };
    const raw = buildInterventionIcs(iv);
    expect(raw).toContain("BEGIN:VCALENDAR");
    expect(raw).toContain("BEGIN:VEVENT");
    expect(raw).toContain("END:VEVENT");
    expect(raw).toContain("SUMMARY:");
    expect(raw).toContain("LOCATION:");
  });

  it("retourne vide sans créneau", () => {
    const iv: Intervention = {
      id: "x",
      title: "t",
      address: "a",
      time: "",
      status: "pending",
      location: { lat: 0, lng: 0 },
    };
    expect(buildInterventionIcs(iv)).toBe("");
  });
});
