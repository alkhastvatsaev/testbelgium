import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readAudioUploadSidecarIfPresent, readTranscriptSidecarIfPresent } from "@/core/services/audio/transcript-sidecar";
import { isSafeUploadsRelativePath } from "@/core/services/audio/intervention-json-path";
import { findUploadedAudioRelativePath } from "@/core/services/audio/resolve-upload-by-basename";
import { readAudioDecisionForUpload } from "@/core/services/audio/audio-route-helpers";

export const runtime = "nodejs";

function publicParamToSafeRelative(urlParam: string): string | null {
  const raw = urlParam.trim();
  if (!raw) return null;
  try {
    const u = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, "http://localhost");
    const pathname = u.pathname;
    if (!pathname.startsWith("/uploads/")) return null;
    const rel = pathname.slice("/uploads/".length);
    return isSafeUploadsRelativePath(rel) ? rel :  null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const urlParam = new URL(request.url).searchParams.get("url")?.trim() ?? "";
    if (!urlParam) {
      return NextResponse.json({ error: "Paramètre url requis" }, { status: 400 });
    }

    let rel = publicParamToSafeRelative(urlParam);
    if (!rel) {
      return NextResponse.json({ audio: null, decision: { status: "none" as const, updatedAt: null } });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const audioAbs = path.join(uploadsDir, ...rel.split("/").filter(Boolean));
    if (!fs.existsSync(audioAbs) || !fs.statSync(audioAbs).isFile()) {
      const found = findUploadedAudioRelativePath(uploadsDir, rel) ?? findUploadedAudioRelativePath(uploadsDir, path.basename(rel));
      if (!found) {
        return NextResponse.json({ audio: null, decision: { status: "none" as const, updatedAt: null } });
      }
      rel = found;
    }

    const finalAbs = path.join(uploadsDir, ...rel.split("/").filter(Boolean));
    if (!fs.existsSync(finalAbs) || !fs.statSync(finalAbs).isFile()) {
      return NextResponse.json({ audio: null, decision: { status: "none" as const, updatedAt: null } });
    }

    const stats = fs.statSync(finalAbs);
    const transcript = readTranscriptSidecarIfPresent(rel);
    const meta = readAudioUploadSidecarIfPresent(rel);
    const audio = {
        name: rel,
        url: `/uploads/${rel.replace(/\\/g, "/")}`,
      createdAt: stats.mtime.toISOString(),
      size: stats.size,
      transcript,
      meta: meta ?? undefined,
    };

    const decision = await readAudioDecisionForUpload(rel);
    return NextResponse.json({ audio, decision });
  } catch (e) {
    console.error("[audio-for-url]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
