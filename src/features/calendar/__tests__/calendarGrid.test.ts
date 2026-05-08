import type { Intervention } from "@/features/interventions/types";
import {
  buildMonthGrid,
  filterScheduledInterventions,
  groupScheduledInterventionsByLocalDay,
  localDayKeyFromParts,
} from "@/features/calendar/calendarGrid";

describe("calendarGrid", () => {
  it("buildMonthGrid produit une grille de 42 cases", () => {
    const g = buildMonthGrid(2026, 4);
    expect(g).toHaveLength(42);
  });

  it("localDayKeyFromParts formate en AAAA-MM-JJ", () => {
    expect(localDayKeyFromParts(2026, 4, 5)).toBe("2026-05-05");
  });

  it("filtre et groupe les interventions planifiées", () => {
    const list: Intervention[] = [
      {
        id: "a",
        title: "x",
        address: "adr",
        time: "",
        status: "pending",
        location: { lat: 0, lng: 0 },
        scheduledDate: "2026-05-05",
        scheduledTime: "14:30",
      },
      {
        id: "b",
        title: "y",
        address: "adr",
        time: "",
        status: "pending",
        location: { lat: 0, lng: 0 },
      },
    ];
    expect(filterScheduledInterventions(list)).toHaveLength(1);
    const map = groupScheduledInterventionsByLocalDay(filterScheduledInterventions(list));
    expect(map.get("2026-05-05")?.map((x) => x.id)).toEqual(["a"]);
  });
});
