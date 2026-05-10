import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function getDemoAudioAbsDir() {
  const isDev = process.env.NODE_ENV !== "production";
  return isDev
    ? path.join(process.cwd(), ".demo-data", "client-audios")
    : path.join(process.cwd(), "public", "client-audios");
}

function inferContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    // prevent path traversal
    const safeName = path.basename(name);
    const absPath = path.join(getDemoAudioAbsDir(), safeName);
    const buf = await readFile(absPath);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": inferContentType(safeName),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
}

