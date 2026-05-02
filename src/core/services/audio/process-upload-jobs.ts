import fs from "fs";
import path from "path";

/** Extensions acceptées par l’API OpenAI Transcriptions (+ usage courant uploads) */
export const UPLOAD_AUDIO_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".wav",
  ".amr",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".ogg",
  ".webm",
]);

/** Ordre de préférence si plusieurs fichiers partagent le même stem (ex. .m4a + .wav ffmpeg) */
const CANONICAL_EXT_ORDER = [
  ".m4a",
  ".mp4",
  ".amr",
  ".mp3",
  ".mpga",
  ".mpeg",
  ".ogg",
  ".wav",
  ".webm",
];

export function listStemsWithVariants(uploadsDir: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!fs.existsSync(uploadsDir)) return map;

  const walk = (dirAbs: string, dirRel: string) => {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const abs = path.join(dirAbs, entry.name);
      const rel = dirRel ? path.posix.join(dirRel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }

      const ext = path.extname(rel).toLowerCase();
      if (!UPLOAD_AUDIO_EXTENSIONS.has(ext)) continue;
      const stem = path.basename(rel, ext);
      if (stem.endsWith(".audio")) continue;
      const arr = map.get(stem) ?? [];
      arr.push(rel);
      map.set(stem, arr);
    }
  };
  walk(uploadsDir, "");
  return map;
}

export function pickCanonicalAudioFile(variants: string[]): string {
  const byExt = new Map(variants.map((v) => [path.extname(v).toLowerCase(), v]));
  for (const ext of CANONICAL_EXT_ORDER) {
    const hit = byExt.get(ext);
    if (hit) return hit;
  }
  return variants[0];
}

export function stemNeedsProcessing(uploadsDir: string, variants: string[]): boolean {
  const canonical = pickCanonicalAudioFile(variants);
  const stem = path.basename(canonical, path.extname(canonical));
  const jsonPath = path.join(uploadsDir, path.dirname(canonical), `${stem}.audio.json`);
  const audioPath = path.join(uploadsDir, canonical);
  if (!fs.existsSync(audioPath)) return false;
  const audioStat = fs.statSync(audioPath);
  if (!fs.existsSync(jsonPath)) return true;
  const jsonStat = fs.statSync(jsonPath);
  return audioStat.mtimeMs > jsonStat.mtimeMs;
}

export type PendingUploadJob = { stem: string; canonical: string; mtimeMs: number };

/** Fichiers audio sans `stem.audio.json` à jour — du plus ancien au plus récent */
export function findPendingUploadJobs(uploadsDir: string): PendingUploadJob[] {
  const map = listStemsWithVariants(uploadsDir);
  const pending: PendingUploadJob[] = [];

  for (const variants of map.values()) {
    if (!stemNeedsProcessing(uploadsDir, variants)) continue;
    const canonical = pickCanonicalAudioFile(variants);
    const stem = path.basename(canonical, path.extname(canonical));
    const audioPath = path.join(uploadsDir, canonical);
    pending.push({
      stem,
      canonical,
      mtimeMs: fs.statSync(audioPath).mtimeMs,
    });
  }

  pending.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return pending;
}
