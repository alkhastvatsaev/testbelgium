import type { Intervention } from "@/features/interventions/types";
import { BACKOFFICE_REVENUE_ESTIMATE_TTC_EUR } from "@/features/backoffice/backofficeConstants";
import { computeTodayActivitySummary } from "@/features/backoffice/todayActivity";

describe("computeTodayActivitySummary", () => {
  const now = new Date("2026-05-05T14:00:00.000Z");
  const sameDayMs = now.getTime();

  function iv(partial: Partial<Intervention> & Pick<Intervention, "id">): Intervention {
    return {
      title: "t",
      address: "a",
      time: "",
      status: "pending",
      location: { lat: 0, lng: 0 },
      ...partial,
    };
  }

  it("compte les terminées et facturées pour le jour Brussels et estime le CA", () => {
    const list = [
      iv({
        id: "1",
        status: "done",
        completedAt: { toMillis: () => sameDayMs },
      }),
      iv({
        id: "2",
        status: "invoiced",
        invoicedAt: { toMillis: () => sameDayMs },
      }),
      iv({
        id: "3",
        status: "pending",
        createdAt: now.toISOString(),
      }),
    ];

    const s = computeTodayActivitySummary(list, now);
    expect(s.completedCount).toBe(2);
    expect(s.invoicedCount).toBe(1);
    expect(s.newRequestsCount).toBe(1);
    expect(s.revenueEstimateEuros).toBe(Math.round(1 * BACKOFFICE_REVENUE_ESTIMATE_TTC_EUR * 100) / 100);
  });
});
