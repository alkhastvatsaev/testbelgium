import type { Intervention } from "@/features/interventions/types";
import {
  formatScheduledLabel,
  getScheduleAnchor,
  interventionClientLabel,
  interventionMatchesTab,
  sortInterventionsByScheduleAsc,
  statusLabelFr,
} from "@/features/interventions/technicianSchedule";

const baseLoc = { lat: 50.84, lng: 4.35 };

describe("technicianSchedule", () => {
  const refNow = new Date("2026-05-05T14:00:00");

  it("getScheduleAnchor utilise scheduledDate + scheduledTime si présents", () => {
    const iv: Intervention = {
      id: "x",
      title: "t",
      address: "a",
      time: "12:00",
      status: "pending",
      location: baseLoc,
      scheduledDate: "2026-06-01",
      scheduledTime: "15:30",
      createdAt: "2026-01-01T10:00:00.000Z",
    };
    const d = getScheduleAnchor(iv);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
  });

  it("interventionMatchesTab exclut les dossiers sans date pour Aujourd’hui / semaine", () => {
    const iv: Intervention = {
      id: "nd",
      title: "Sans date",
      address: "Rue X",
      time: "",
      status: "pending",
      location: baseLoc,
    };
    expect(interventionMatchesTab(iv, "all", refNow)).toBe(true);
    expect(interventionMatchesTab(iv, "today", refNow)).toBe(false);
    expect(interventionMatchesTab(iv, "week", refNow)).toBe(false);
  });

  it("filtre aujourd’hui vs cette semaine vs toutes", () => {
    const todayIv: Intervention = {
      id: "t1",
      title: "Aujourd’hui",
      address: "a",
      time: "09:00",
      status: "pending",
      location: baseLoc,
      createdAt: "2026-05-05T09:00:00.000Z",
    };
    const weekIv: Intervention = {
      id: "w1",
      title: "Lundi semaine",
      address: "b",
      time: "09:00",
      status: "pending",
      location: baseLoc,
      createdAt: "2026-05-04T09:00:00.000Z",
    };
    const oldIv: Intervention = {
      id: "o1",
      title: "Vieux",
      address: "c",
      time: "09:00",
      status: "done",
      location: baseLoc,
      createdAt: "2026-04-01T09:00:00.000Z",
    };

    expect(interventionMatchesTab(todayIv, "today", refNow)).toBe(true);
    expect(interventionMatchesTab(weekIv, "today", refNow)).toBe(false);
    expect(interventionMatchesTab(weekIv, "week", refNow)).toBe(true);
    expect(interventionMatchesTab(oldIv, "week", refNow)).toBe(false);
    expect(interventionMatchesTab(oldIv, "all", refNow)).toBe(true);
  });

  it("sortInterventionsByScheduleAsc trie du plus tôt au plus tard", () => {
    const a: Intervention = {
      id: "late",
      title: "",
      address: "",
      time: "",
      status: "pending",
      location: baseLoc,
      createdAt: "2026-05-05T18:00:00.000Z",
    };
    const b: Intervention = {
      id: "early",
      title: "",
      address: "",
      time: "",
      status: "pending",
      location: baseLoc,
      createdAt: "2026-05-05T08:00:00.000Z",
    };
    const sorted = sortInterventionsByScheduleAsc([a, b]);
    expect(sorted.map((x) => x.id)).toEqual(["early", "late"]);
  });

  it("interventionClientLabel et statusLabelFr", () => {
    expect(
      interventionClientLabel({
        id: "1",
        title: "",
        address: "",
        time: "",
        status: "pending",
        location: baseLoc,
        clientName: "  Dupont ",
      }),
    ).toBe("Dupont");
    expect(statusLabelFr("pending")).toBe("En attente");
    expect(statusLabelFr("in_progress")).toBe("En cours");
  });

  it("formatScheduledLabel retombe sur time si pas de date parsable", () => {
    expect(
      formatScheduledLabel({
        id: "z",
        title: "",
        address: "",
        time: "14:30",
        status: "pending",
        location: baseLoc,
      }),
    ).toBe("14:30");
  });
});
