import fs from "fs";
import path from "path";

/**
 * Trouve un fichier audio sous `public/uploads` (y compris sous-dossiers clients).
 * Accepte soit un chemin relatif complet (`M_DUPONT/call.m4a`), soit le seul basename.
 */
export function findUploadedAudioRelativePath(uploadsDir: string, fileName: string): string | null {
  if (!fs.existsSync(uploadsDir)) return null;

  const raw = fileName
    .trim()
    .replace(/^\/+/, "")
    .replace(/^uploads\/?/i, "");
  if (!raw || raw === "." || raw.includes("..")) return null;

  if (raw.includes("/") || raw.includes("\\")) {
    const normalized = raw
      .split(/[/\\]+/)
      .filter((p) => p && p !== "." && p !== "..")
      .join("/");
    if (!normalized || !/\.(m4a|mp3|wav|amr)$/i.test(path.basename(normalized))) return null;
    const resolvedDir = path.resolve(uploadsDir);
    const candidateAbs = path.resolve(path.join(uploadsDir, ...normalized.split("/")));
    const relToDir = path.relative(resolvedDir, candidateAbs);
    if (relToDir.startsWith("..") || path.isAbsolute(relToDir)) return null;
    try {
      if (fs.existsSync(candidateAbs) && fs.statSync(candidateAbs).isFile()) {
        return normalized.replace(/\\/g, "/");
      }
    } catch {
      return null;
    }
  }

  const base = path.basename(raw);
  if (!base || base === "." || base === "..") return null;
  if (!/\.(m4a|mp3|wav|amr)$/i.test(base)) return null;

  const walk = (dirAbs: string, dirRel: string): string | null => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const abs = path.join(dirAbs, e.name);
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        const found = walk(abs, rel);
        if (found) return found;
      } else if (e.name === base) {
        return rel.replace(/\\/g, "/");
      }
    }
    return null;
  };

  return walk(uploadsDir, "");
}
