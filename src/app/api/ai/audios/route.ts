import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readAudioUploadSidecarIfPresent, readTranscriptSidecarIfPresent } from '@/core/services/audio/transcript-sidecar';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ audios: [] });
    }

    const walk = (dirAbs: string, dirRel: string): string[] => {
      const out: string[] = [];
      const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const abs = path.join(dirAbs, e.name);
        const rel = dirRel ? path.posix.join(dirRel, e.name) : e.name;
        if (e.isDirectory()) {
          out.push(...walk(abs, rel));
        } else {
          out.push(rel);
        }
      }
      return out;
    };

    const files = walk(uploadsDir, '');

    const audios = files
      .filter(
        (file) =>
          file.endsWith('.amr') ||
          file.endsWith('.wav') ||
          file.endsWith('.mp3') ||
          file.endsWith('.m4a')
      )
      .map((file) => {
        const stats = fs.statSync(path.join(uploadsDir, file));
        const transcript = readTranscriptSidecarIfPresent(file);
        const meta = readAudioUploadSidecarIfPresent(file);
        return {
          name: file,
          url: `/uploads/${file}`,
          createdAt: stats.mtime.toISOString(),
          size: stats.size,
          transcript,
          meta: meta ?? undefined,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ audios });
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers audio :', error);
    return NextResponse.json({ error: 'Impossible de lire le dossier' }, { status: 500 });
  }
}
