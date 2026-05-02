import { NextResponse } from "next/server";
import path from "path";
import { findUploadedAudioRelativePath } from "@/core/services/audio/resolve-upload-by-basename";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name")?.trim();
    if (!name) {
      return NextResponse.json({ error: "Paramètre name requis" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const rel = findUploadedAudioRelativePath(uploadsDir, name);
    if (!rel) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    return NextResponse.json({ url: `/uploads/${rel}` });
  } catch (e) {
    console.error("[resolve-audio-url]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
