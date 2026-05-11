import fs from "fs";
import path from "path";

function sanitizeFolderName(name: string): string {
  const upper = name
    .trim()
    .toUpperCase()
    // keep letters/numbers/_/-
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return upper || "UNKNOWN";
}

export function guessClientFolderNameFromText(text: string): string {
  const t = text || "";
  // simple heuristics: "monsieur X" / "madame X" / "mme X" / "m. X"
  const civ =
    /(monsieur|madame|mme|m\.)\s+[A-ZÀ-ÖØ-Ý]/i.exec(t)?.[1]?.toLowerCase() ?? null;
  const m =
    /(?:monsieur|madame|mme|m\.)\s+([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?:\b|,|\.)/i.exec(t) ||
    /je m'appelle\s+(?:monsieur|madame|mme|m\.)?\s*([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?:\b|,|\.)/i.exec(t);

  const lastName = sanitizeFolderName((m?.[1] ?? "").trim());
  if (!lastName || lastName === "UNKNOWN") return "UNKNOWN";

  const prefix = civ === "madame" || civ === "mme" ? "MME_" : civ === "monsieur" || civ === "m." ? "M_" : "UNKNOWN_";
  return sanitizeFolderName(`${prefix}${lastName}`);
}

export function moveUploadBundleIntoClientFolder(params: {
  uploadsDir: string;
  relativeAudioFileName: string; // may include subdirs
  clientFolderName: string; // raw (will be sanitized)
}): { newRelativeAudioFileName: string } {
  const { uploadsDir, relativeAudioFileName } = params;
  const folder = sanitizeFolderName(params.clientFolderName);

  const fromAbs = path.join(uploadsDir, relativeAudioFileName);
  const base = path.basename(relativeAudioFileName, path.extname(relativeAudioFileName));
  const ext = path.extname(relativeAudioFileName);

  const targetDir = path.join(uploadsDir, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const toRel = path.posix.join(folder, `${base}${ext}`);
  const toAbs = path.join(uploadsDir, toRel);

  if (fromAbs !== toAbs && fs.existsSync(fromAbs)) {
    fs.renameSync(fromAbs, toAbs);
  }

  // Move known sidecars next to it (based on stem)
  const sidecars = [
    `${base}.audio.json`,
    `${base}.transcript.txt`,
    `${base}.decision.json`,
    `${base}.intervention.json`,
  ];

  for (const f of sidecars) {
    const from = path.join(uploadsDir, path.dirname(relativeAudioFileName), f);
    const to = path.join(targetDir, f);
    if (from !== to && fs.existsSync(from)) {
      fs.renameSync(from, to);
    }
  }

  return { newRelativeAudioFileName: toRel };
}

