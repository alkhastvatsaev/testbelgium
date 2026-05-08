import type { Intervention } from "@/features/interventions/types";
import { buildInterventionHistory } from "@/features/backoffice/interventionHistory";

describe("buildInterventionHistory", () => {
  const minimal: Intervention = {
    id: "iv1",
    title: "Serrure",
    address: "Ixelles",
    time: "",
    status: "pending",
    location: { lat: 0, lng: 0 },
  };

  it("inclut création, assignation, fin et facturation lorsque pertinent", () => {
    const iv: Intervention = {
      ...minimal,
      status: "invoiced",
      createdAt: "2026-05-01T08:00:00.000Z",
      assignedTechnicianUid: "tech-9",
      completedAt: { toMillis: () => new Date("2026-05-02T10:00:00Z").getTime() },
      invoicedAt: { toMillis: () => new Date("2026-05-03T11:00:00Z").getTime() },
      invoicePdfUrl: "https://example.com/f.pdf",
    };
    const h = buildInterventionHistory(iv);
    expect(h.map((x) => x.id)).toEqual(["created", "assigned", "completed", "invoice"]);
    expect(h.find((x) => x.id === "invoice")?.detail).toMatch(/PDF émis/);
  });

  it("sans assignation, pas d’entrée assigned", () => {
    const h = buildInterventionHistory({
      ...minimal,
      createdAt: "2026-05-01T08:00:00.000Z",
    });
    expect(h.map((x) => x.id)).toEqual(["created"]);
  });
});
