/**
 * Infère nom / date-heure depuis la transcription brute (sans modifier le prompt OpenAI).
 */

function normalizeFrenchForHourMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseNamePart(raw: string): string {
  return raw
    .split(/-/u)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join("-");
}

/** Heures écrites en lettres avant « heure(s) » — ordre : formes longues d’abord. */
const FRENCH_SPOKEN_HOUR_PATTERNS: Array<[RegExp, number]> = [
  [/\bvingt[\s-]trois\s+heures?\b/, 23],
  [/\bvingt[\s-]deux\s+heures?\b/, 22],
  [/\bvingt[\s-]et[\s-]un\s+heures?\b/, 21],
  [/\bvingt\s+et\s+un\s+heures?\b/, 21],
  [/\bdix[\s-]neuf\s+heures?\b/, 19],
  [/\bdix[\s-]huit\s+heures?\b/, 18],
  [/\bdix[\s-]sept\s+heures?\b/, 17],
  [/\bseize\s+heures?\b/, 16],
  [/\bquinze\s+heures?\b/, 15],
  [/\bquatorze\s+heures?\b/, 14],
  [/\btreize\s+heures?\b/, 13],
  [/\bdouze\s+heures?\b/, 12],
  [/\bonze\s+heures?\b/, 11],
  [/\bdix\s+heures?\b/, 10],
  [/\bneuf\s+heures?\b/, 9],
  [/\bhuit\s+heures?\b/, 8],
  [/\bsept\s+heures?\b/, 7],
  [/\bsix\s+heures?\b/, 6],
  [/\bcinq\s+heures?\b/, 5],
  [/\bquatre\s+heures?\b/, 4],
  [/\btrois\s+heures?\b/, 3],
  [/\bdeux\s+heures?\b/, 2],
  [/(?<![\p{L}'])une\s+heure\b/u, 1],
  [/\bun\s+heures?\b/, 1],
];

export function extractSpokenFrenchHour(text: string): number | null {
  const x = normalizeFrenchForHourMatch(text);
  for (const [re, n] of FRENCH_SPOKEN_HOUR_PATTERNS) {
    if (re.test(x)) return n;
  }
  if (/\bmidi\b/.test(x)) return 12;
  if (/\bminuit\b/.test(x)) return 0;
  return null;
}

export function extractClientNameFromText(text: string): string {
  const t = text || "";

  const aLappareil = /([\p{L}][\p{L}'’\-]{0,48})\s+à\s+l['\u2019]?\s*appareil/ui.exec(t);
  if (aLappareil?.[1]) {
    const last = aLappareil[1].replace(/-+$/u, "").trim();
    if (!last) return "";
    const cap = titleCaseNamePart(last);
    return `M. ${cap}`;
  }

  const m =
    /(?:monsieur|madame|mme|m\.)\s+([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?:\b|,|\.)/i.exec(t) ||
    /je m'appelle\s+(?:monsieur|madame|mme|m\.)?\s*([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?:\b|,|\.)/i.exec(t);
  const last = (m?.[1] ?? "").trim();
  if (!last) return "";
  const civ = /(monsieur|madame|mme|m\.)\s+[A-ZÀ-ÖØ-Ý]/i.exec(t)?.[1]?.toLowerCase() ?? null;
  const prefix = civ === "madame" || civ === "mme" ? "Mme" : "M.";
  const cap = titleCaseNamePart(last);
  return `${prefix} ${cap}`;
}

export function extractDateTimeFromText(
  text: string,
  baseIso?: string,
): { date: string; time: string } {
  const tLower = (text || "").toLowerCase();
  const base = baseIso ? new Date(baseIso) : new Date();
  const d = new Date(base);
  if (tLower.includes("après-demain") || tLower.includes("apres-demain")) d.setDate(d.getDate() + 2);
  else if (tLower.includes("demain")) d.setDate(d.getDate() + 1);

  const timeMatch =
    /(\d{1,2})\s*h\s*(\d{2})/i.exec(text) ||
    /(\d{1,2})\s*h\b/i.exec(text) ||
    /(\d{1,2}):(\d{2})/.exec(text);

  let hh = "";
  let mm = "00";
  if (timeMatch) {
    hh = String(timeMatch[1]).padStart(2, "0");
    if (timeMatch[2] != null) mm = String(timeMatch[2]).padStart(2, "0");
  }

  if (!hh) {
    const spoken = extractSpokenFrenchHour(text);
    if (spoken !== null) {
      hh = String(spoken).padStart(2, "0");
    }
  }

  const yyyy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return {
    date: `${yyyy}-${mo}-${da}`,
    time: hh ? `${hh}:${mm}` : "",
  };
}
