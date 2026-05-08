import { remoteCompletionIsNewerThanQueued } from "@/features/offline/completionConflict";

describe("remoteCompletionIsNewerThanQueued", () => {
  it("retourne faux si le statut distant n’est pas done", () => {
    expect(remoteCompletionIsNewerThanQueued("in_progress", { toMillis: () => 999_999 }, 100)).toBe(false);
  });

  it("retourne faux sans date de complétion distante", () => {
    expect(remoteCompletionIsNewerThanQueued("done", undefined, 100)).toBe(false);
  });

  it("retourne vrai si completedAt distant est strictement après queuedAtMs", () => {
    expect(remoteCompletionIsNewerThanQueued("done", { toMillis: () => 500 }, 400)).toBe(true);
    expect(remoteCompletionIsNewerThanQueued("invoiced", { toMillis: () => 500 }, 400)).toBe(true);
  });

  it("retourne faux si completedAt distant est égal ou avant queuedAtMs", () => {
    expect(remoteCompletionIsNewerThanQueued("done", { toMillis: () => 400 }, 400)).toBe(false);
    expect(remoteCompletionIsNewerThanQueued("done", { toMillis: () => 300 }, 400)).toBe(false);
  });

  it("accepte une Date distante", () => {
    expect(remoteCompletionIsNewerThanQueued("done", new Date(600), 500)).toBe(true);
  });
});
