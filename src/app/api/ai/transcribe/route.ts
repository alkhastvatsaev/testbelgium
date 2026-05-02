import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { transcrireAppelSerrurier } from '@/core/services/audio/transcription';
import { writeAudioUploadSidecar } from '@/core/services/audio/transcript-sidecar';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl : '';
    const writeSidecar = Boolean(body.writeSidecar);

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl requis' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const absolute =
      audioUrl.startsWith('http://') || audioUrl.startsWith('https://')
        ? audioUrl
        : `${origin}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;

    const { analysis, rawTranscript } = await transcrireAppelSerrurier(absolute, audioUrl.split('/').pop() || 'audio.wav');

    if (writeSidecar && audioUrl.startsWith('/uploads/')) {
      const processedAt = new Date().toISOString();
      const audioFileName = audioUrl.replace(/^\/uploads\//, '');
      const diskPath = path.join(process.cwd(), 'public', 'uploads', audioFileName);
      let sizeBytes = 0;
      try {
        if (fs.existsSync(diskPath)) sizeBytes = fs.statSync(diskPath).size;
      } catch {
        /* ignore */
      }
      writeAudioUploadSidecar(audioUrl, {
        schemaVersion: 1,
        audioFileName,
        publicUrl: audioUrl,
        phone: null,
        receivedAt: processedAt,
        processedAt,
        source: 'api-transcribe',
        openai: {
          transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-transcribe',
          dispatchModel: process.env.OPENAI_DISPATCH_MODEL?.trim() || 'gpt-4o-mini',
        },
        rawTranscript,
        audio: {
          sizeBytes,
          clientOriginalFileName: null,
          storedRelativePath: `uploads/${audioFileName}`,
          transcodedToWavForStt: false,
        },
        analysis,
      });
    }

    return NextResponse.json({ success: true, data: analysis, rawTranscript });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[transcribe]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
