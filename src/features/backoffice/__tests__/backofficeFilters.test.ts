/** @jest-environment jsdom */
import type { Intervention } from "@/features/interventions/types";
import {
  applyBackofficeFilters,
  defaultBackofficeViewFilters,
  ivPlanningDayKeyBrussels,
  sortBackofficeRowsDesc,
  uniqueAssignedTechnicianUids,
} from "../backofficeFilters";

describe("backofficeFilters", () => {
  const base: Intervention = {
    id: "x1",
    title: "Test",
    address: "Rue",
    time: "10:00",
    status: "pending",
    location: { lat: 0, lng: 0 },
    createdAt: "2026-05-01T08:00:00.000Z",
    scheduledDate: "2026-05-05",
    scheduledTime: "14:00",
    assignedTechnicianUid: "tech-a",
  };

  it("filtre le bucket statut « pending » (inclut pending_needs_address)", () => {
    const list: Intervention[] = [
      base,
      { ...base, id: "x2", status: "pending_needs_address" },
      { ...base, id: "x3", status: "done" },
    ];
    const f = defaultBackofficeViewFilters();
    const next = { ...f, statusBucket: "pending" as const };
    const out = applyBackofficeFilters(list, next);
    expect(out.map((i) => i.id).sort()).toEqual(["x1", "x2"]);
  });

  it("filtre par technicien", () => {
    const list: Intervention[] = [
      base,
      { ...base, id: "y2", assignedTechnicianUid: "other" },
    ];
    const f = { ...defaultBackofficeViewFilters(), technicianUid: "tech-a" };
    expect(applyBackofficeFilters(list, f)).toHaveLength(1);
  });

  it("plage custom basée sur jour Brussels planifié", () => {
    const iv: Intervention = {
      ...base,
      scheduledDate: "2026-05-05",
      scheduledTime: "14:00",
    };
    const dk = ivPlanningDayKeyBrussels(iv);
    expect(dk).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const f = {
      ...defaultBackofficeViewFilters(),
      activityWindow: "custom" as const,
      dateFrom: dk!,
      dateTo: dk!,
    };
    expect(applyBackofficeFilters([iv], f)).toHaveLength(1);
    const f2 = { ...f, dateFrom: "2099-01-01" };
    expect(applyBackofficeFilters([iv], f2)).toHaveLength(0);
  });

  it("uniqueAssignedTechnicianUids trie et déduplique", () => {
    expect(uniqueAssignedTechnicianUids([base, { ...base, assignedTechnicianUid: "tech-a" }, { ...base, id: "z", assignedTechnicianUid: "tech-b" }])).toEqual([
      "tech-a",
      "tech-b",
    ]);
  });

  it("sortBackofficeRowsDesc préfère createdAt récent", () => {
    const a: Intervention = { ...base, id: "old", createdAt: "2026-01-01T00:00:00.000Z" };
    const b: Intervention = { ...base, id: "new", createdAt: "2026-06-01T00:00:00.000Z" };
    expect(sortBackofficeRowsDesc([a, b]).map((x) => x.id)).toEqual(["new", "old"]);
  });
});
