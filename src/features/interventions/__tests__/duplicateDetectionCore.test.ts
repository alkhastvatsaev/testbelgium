import type { Intervention } from "@/features/interventions/types";
import {
  findPotentialDuplicateAmong,
  formatDuplicateRelativeCreated,
  jaccardTokenSimilarity,
  normalizeAddressForDedupe,
} from "@/features/interventions/duplicateDetectionCore";

describe("duplicateDetectionCore", () => {
  it("normalise les accents et la ponctuation pour l’adresse", () => {
    expect(normalizeAddressForDedupe("Rue de la Loi, 16 — BRUXELLES")).toContain("bruxelles");
  });

  it("calcule une similarité Jaccard raisonnable pour deux phrases proches", () => {
    const a = "porte bloquée clé ne tourne pas";
    const b = "porte bloquée la clé ne tourne plus";
    expect(jaccardTokenSimilarity(a, b)).toBeGreaterThan(0.38);
  });

  it("formatte hier / aujourd’hui / il y a N jours", () => {
    const now = new Date("2026-05-05T12:00:00Z").getTime();
    expect(formatDuplicateRelativeCreated(now, now)).toBe("aujourd'hui");
    expect(formatDuplicateRelativeCreated(now - 24 * 60 * 60 * 1000, now)).toBe("hier");
    expect(formatDuplicateRelativeCreated(now - 3 * 24 * 60 * 60 * 1000, now)).toBe("il y a 3 jours");
  });

  it("retourne un doublon quand adresse identique et problème similaire dans la fenêtre", () => {
    const addr = "Rue du Midi 10, 1000 Bruxelles";
    const prob = "serrure bloquée impossible de tourner la clé";
    const now = new Date("2026-05-05T12:00:00Z").getTime();
    const oldMs = now - 12 * 60 * 60 * 1000;

    const oldIv: Intervention = {
      id: "old-one",
      title: prob,
      address: addr,
      time: "10:00",
      status: "pending",
      location: { lat: 0, lng: 0 },
      problem: prob,
      createdAt: new Date(oldMs).toISOString(),
      companyId: "c1",
    };

    const candidates: Intervention[] = [
      oldIv,
      {
        ...oldIv,
        id: "far-address",
        address: "Autre rue 99",
        createdAt: new Date(oldMs).toISOString(),
      },
    ];

    const dup = findPotentialDuplicateAmong({
      excludeId: "new-one",
      address: addr,
      problem: prob,
      candidates,
      now,
    });

    expect(dup?.id).toBe("old-one");
  });

  it("ignore hors fenêtre 48h", () => {
    const addr = "Rue du Midi 10, 1000 Bruxelles";
    const prob = "serrure bloquée impossible de tourner la clé";
    const now = new Date("2026-05-05T12:00:00Z").getTime();
    const oldMs = now - 72 * 60 * 60 * 1000;

    const oldIv: Intervention = {
      id: "old-one",
      title: prob,
      address: addr,
      time: "10:00",
      status: "pending",
      location: { lat: 0, lng: 0 },
      problem: prob,
      createdAt: new Date(oldMs).toISOString(),
      companyId: "c1",
    };

    const dup = findPotentialDuplicateAmong({
      excludeId: "new-one",
      address: addr,
      problem: prob,
      candidates: [oldIv],
      now,
    });

    expect(dup).toBeNull();
  });
});
