import {
  applyQuoteRequestOrder,
  moveAllSentToEnd,
  moveItemToEndById,
  type QuoteRequestRow,
} from "../quoteRequestsOrder";

describe("moveItemToEndById", () => {
  it("met la ligne demandée en dernière position", () => {
    const rows = [
      { id: 1, n: "a" },
      { id: 2, n: "b" },
      { id: 3, n: "c" },
    ];
    expect(moveItemToEndById(rows, 1)).toEqual([
      { id: 2, n: "b" },
      { id: 3, n: "c" },
      { id: 1, n: "a" },
    ]);
  });

  it("ne duplique pas si déjà en bas", () => {
    const rows = [
      { id: 1, n: "a" },
      { id: 2, n: "b" },
    ];
    expect(moveItemToEndById(rows, 2)).toEqual(rows);
  });

  it("retourne une copie si id inconnu", () => {
    const rows = [{ id: 1, n: "a" }];
    expect(moveItemToEndById(rows, 99)).toEqual(rows);
  });
});

describe("moveAllSentToEnd", () => {
  const rows = [
    { id: 1, n: "a" },
    { id: 2, n: "b" },
    { id: 3, n: "c" },
  ];

  it("place les lignes « envoyées » (✓) en bas de liste", () => {
    const sent = { 1: true, 2: true } as Record<number, boolean>;
    expect(moveAllSentToEnd(rows, sent).map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it("ne change rien s’aucun envoyé", () => {
    expect(moveAllSentToEnd(rows, {})).toEqual(rows);
  });
});

describe("applyQuoteRequestOrder", () => {
  const base: QuoteRequestRow[] = [
    { id: 1, clientName: "A", service: "s", days: 0, status: "Nouveau" },
    { id: 2, clientName: "B", service: "s", days: 0, status: "Nouveau" },
  ];

  it("réordonne selon la liste d’ids", () => {
    expect(applyQuoteRequestOrder(base, [2, 1]).map((r) => r.id)).toEqual([2, 1]);
  });

  it("append les ids manquants à la fin", () => {
    expect(applyQuoteRequestOrder(base, [2]).map((r) => r.id)).toEqual([2, 1]);
  });
});
