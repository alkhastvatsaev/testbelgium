
export function unknownTimestampToMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (
    typeof v === "object" &&
    v !== null &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => unknown }).toMillis === "function"
  ) {
    const n = (v as { toMillis: () => number }).toMillis();
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}


export function dayKeyBrusselsFromMs(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function todayKeyBrussels(now = new Date()): string {
  return dayKeyBrusselsFromMs(now.getTime());
}
