import type { Intervention } from "@/features/interventions/types";
import {
  DUPLICATE_DETECTION_WINDOW_MS,
  DUPLICATE_PROBLEM_SIMILARITY_MIN,
} from "@/features/interventions/interventionDuplicateConstants";
import { unknownTimestampToMs } from "@/features/backoffice/timeHelpers";

/** Adresse normalisée pour comparaison « même rue ». */
export function normalizeAddressForDedupe(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return s;
}

export function problemTextForDedupe(iv: Pick<Intervention, "problem" | "title">): string {
  const p = (iv.problem ?? "").trim();
  if (p) return p;
  return (iv.title ?? "").trim();
}

function tokenize(text: string): Set<string> {
  const t = normalizeAddressForDedupe(text).split(" ").filter((w) => w.length > 2);
  return new Set(t);
}

/** Similarité Jaccard entre deux ensembles de tokens (0–1). */
export function jaccardTokenSimilarity(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter += 1;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function interventionCreatedAtMs(iv: Intervention): number | null {
  const ms = unknownTimestampToMs(iv.createdAt as unknown);
  if (ms != null) return ms;
  return null;
}

export function formatDuplicateRelativeCreated(createdAtMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - createdAtMs);
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}

export type FindDuplicateParams = {
  excludeId: string;
  address: string;
  problem: string;
  candidates: Intervention[];
  windowMs?: number;
  now?: number;
  similarityMin?: number;
};

/**
 * Trouve la meilleure intervention « doublon » dans la fenêtre temporelle :
 * même adresse normalisée + similarité texte du problème ≥ seuil.
 */
export function findPotentialDuplicateAmong(params: FindDuplicateParams): Intervention | null {
  const {
    excludeId,
    address,
    problem,
    candidates,
    windowMs = DUPLICATE_DETECTION_WINDOW_MS,
    now = Date.now(),
    similarityMin = DUPLICATE_PROBLEM_SIMILARITY_MIN,
  } = params;

  const addrNorm = normalizeAddressForDedupe(address.trim());
  if (!addrNorm || addrNorm === "adresse inconnue") return null;

  const probRaw = problem.trim();
  if (!probRaw) return null;

  let best: { iv: Intervention; score: number; createdMs: number } | null = null;

  for (const iv of candidates) {
    if (iv.id === excludeId) continue;
    const ms = interventionCreatedAtMs(iv);
    if (ms == null || ms > now || now - ms > windowMs) continue;

    const ivAddr = normalizeAddressForDedupe(iv.address ?? "");
    if (!ivAddr || ivAddr !== addrNorm) continue;

    const ivProb = problemTextForDedupe(iv);
    const score = jaccardTokenSimilarity(probRaw, ivProb || iv.title || "");
    if (score < similarityMin) continue;

    if (!best || score > best.score || (score === best.score && ms > best.createdMs)) {
      best = { iv, score, createdMs: ms };
    }
  }

  return best?.iv ?? null;
}
