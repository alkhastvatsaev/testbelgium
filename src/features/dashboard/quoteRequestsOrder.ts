/** Lignes avec statut « mail envoyé » (✓ vert) regroupées en bas. */

export function moveAllSentToEnd<T extends { id: number }>(
  items: readonly T[],
  sentById: Readonly<Record<number, boolean>>,
): T[] {
  const unsent = items.filter((r) => !sentById[r.id]);
  const sent = items.filter((r) => Boolean(sentById[r.id]));
  return [...unsent, ...sent];
}

/** Après envoi mail réussi : cette ligne passe en dernier (souvent pile sous les autres ✓). */
export function moveItemToEndById<T extends { id: number }>(items: readonly T[], id: number): T[] {
  const idx = items.findIndex((x) => x.id === id);
  if (idx <= -1 || idx >= items.length - 1) return [...items];
  const item = items[idx];
  const prev = items.slice(0, idx);
  const next = items.slice(idx + 1);
  return [...prev, ...next, item];
}

export type QuoteRequestRow = {
  id: number;
  clientName: string;
  service: string;
  days: number;
  status: string;
};

export function applyQuoteRequestOrder(
  base: readonly QuoteRequestRow[],
  orderIds: readonly number[],
): QuoteRequestRow[] {
  const map = new Map(base.map((r) => [r.id, r]));
  const ordered: QuoteRequestRow[] = [];
  const seen = new Set<number>();
  for (const oid of orderIds) {
    const r = map.get(oid);
    if (r) {
      ordered.push(r);
      seen.add(oid);
    }
  }
  for (const r of base) {
    if (!seen.has(r.id)) ordered.push(r);
  }
  return ordered;
}
