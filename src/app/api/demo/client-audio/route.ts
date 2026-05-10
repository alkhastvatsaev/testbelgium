import { NextResponse } from "next/server";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function getDemoAudioAbsDir() {
  // In dev, writing under /public triggers Next full reloads (panels jump + state loss).
  // In prod, it's ok to keep demo artifacts in /public/client-audios for easy inspection.
  const isDev = process.env.NODE_ENV !== "production";
  return isDev
    ? path.join(process.cwd(), ".demo-data", "client-audios")
    : path.join(process.cwd(), "public", "client-audios");
}

export async function GET() {
  try {
    const absDir = getDemoAudioAbsDir();
    const entries = await readdir(absDir).catch(() => []);
    const files = (
      await Promise.all(
        entries
          .filter((n) => !n.startsWith("."))
          .map(async (name) => {
            const absPath = path.join(absDir, name);
            try {
              const st = await stat(absPath);
              return st.isFile() ? { name, size: st.size, mtimeMs: st.mtimeMs } : null;
            } catch {
              return null;
            }
          }),
      )
    ).filter(Boolean);

    return NextResponse.json({ dir: absDir, files });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list audios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const mime = file.type || "audio/webm";
    const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("webm") ? "webm" : "bin";
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const relName = `${id}.${ext}`;
    const absDir = getDemoAudioAbsDir();
    const absPath = path.join(absDir, relName);

    await mkdir(absDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buf);

    const url = `/api/demo/client-audio/file/${encodeURIComponent(relName)}`;
    // "storagePath" is a semantic label for back-office fallbacks.
    return NextResponse.json({
      url,
      storagePath: `client-audios/${relName}`,
      mimeType: mime,
      debug: {
        cwd: process.cwd(),
        absDir,
        absPath,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save audio" }, { status: 500 });
  }
}

