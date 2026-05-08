import { generateDailyAssignmentsAsInterventions } from "@/utils/dailyMockAssignments";
import { generateDailyMissions } from "@/utils/mockMissions";

describe("generateDailyAssignmentsAsInterventions", () => {
  it("aligne le nombre de dossiers sur generateDailyMissions pour une date fixe", () => {
    const d = new Date("2026-03-15T12:00:00");
    const missions = generateDailyMissions(d);
    const ivs = generateDailyAssignmentsAsInterventions(d);
    expect(ivs.length).toBe(missions.length);
    expect(ivs.every((iv) => iv.assignedTechnicianUid)).toBe(true);
    expect(ivs[0]?.id).toBe(`mock-day-${d.toLocaleDateString("en-CA")}-0`);
  });
});
