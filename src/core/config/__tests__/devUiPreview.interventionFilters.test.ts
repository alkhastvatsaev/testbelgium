import { isSyntheticInterventionId, stripKnownSyntheticInterventions } from "../devUiPreview";

describe("isSyntheticInterventionId", () => {
  it("identifie les seeds historiques et le préfixe mock-day", () => {
    expect(isSyntheticInterventionId("1")).toBe(true);
    expect(isSyntheticInterventionId("2")).toBe(true);
    expect(isSyntheticInterventionId("3")).toBe(true);
    expect(isSyntheticInterventionId("demo-mission-backoffice-only")).toBe(true);
    expect(isSyntheticInterventionId("mock-day-2026-05-10-0")).toBe(true);
    expect(isSyntheticInterventionId("")).toBe(false);
    expect(isSyntheticInterventionId("aRealFirestoreDocId")).toBe(false);
  });
});

describe("stripKnownSyntheticInterventions", () => {
  it("retire les entrées synthétiques", () => {
    expect(
      stripKnownSyntheticInterventions([{ id: "1", x: 1 }, { id: "realId", x: 2 }]),
    ).toEqual([{ id: "realId", x: 2 }]);
  });
});
