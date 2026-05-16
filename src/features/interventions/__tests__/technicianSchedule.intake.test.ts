import type { Intervention } from "@/features/interventions/types";
import {
  interventionVisibleInTechnicianMissionList,
  isInterventionPendingBackOfficeIntake,
  isInterventionReleasedToTechnicianField,
} from "@/features/interventions/technicianSchedule";

function iv(status: Intervention["status"]): Intervention {
  return {
    id: "x",
    title: "Test",
    address: "Rue test",
    time: "10:00",
    status,
    location: { lat: 50.8, lng: 4.35 },
  };
}

describe("technicianSchedule intake gate", () => {
  it("keeps pending dossiers in IVANA Demandes only", () => {
    expect(isInterventionPendingBackOfficeIntake(iv("pending"))).toBe(true);
    expect(isInterventionPendingBackOfficeIntake(iv("pending_needs_address"))).toBe(true);
    expect(isInterventionReleasedToTechnicianField(iv("pending"))).toBe(false);
    expect(isInterventionReleasedToTechnicianField(iv("pending_needs_address"))).toBe(false);
  });

  it("releases dossiers after IVANA validation (including assigned awaiting accept)", () => {
    expect(isInterventionReleasedToTechnicianField(iv("assigned"))).toBe(true);
    expect(isInterventionReleasedToTechnicianField(iv("in_progress"))).toBe(true);
    expect(isInterventionReleasedToTechnicianField(iv("en_route"))).toBe(true);
  });
});

describe("interventionVisibleInTechnicianMissionList", () => {
  const now = new Date("2026-05-16T12:00:00");
  const techUid = "demo-tech-local";

  it("keeps assigned missions visible before accept even if not scheduled today", () => {
    const row = {
      ...iv("assigned"),
      assignedTechnicianUid: techUid,
      scheduledDate: "2030-01-01",
      scheduledTime: "09:00",
    };
    expect(interventionVisibleInTechnicianMissionList(row, "today", techUid, now)).toBe(true);
  });

  it("hides accepted missions outside the today tab window", () => {
    const row = {
      ...iv("en_route"),
      assignedTechnicianUid: techUid,
      technicianAcceptedAt: "2026-05-16T08:00:00.000Z",
      scheduledDate: "2030-01-01",
      scheduledTime: "09:00",
    };
    expect(interventionVisibleInTechnicianMissionList(row, "today", techUid, now)).toBe(false);
  });

  it("shows accepted missions scheduled for today", () => {
    const row = {
      ...iv("en_route"),
      assignedTechnicianUid: techUid,
      technicianAcceptedAt: "2026-05-16T08:00:00.000Z",
      scheduledDate: "2026-05-16",
      scheduledTime: "14:00",
    };
    expect(interventionVisibleInTechnicianMissionList(row, "today", techUid, now)).toBe(true);
  });
});
