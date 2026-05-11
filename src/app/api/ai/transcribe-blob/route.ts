import { NextResponse } from 'next/server';
import { getClient, transcribeAudioToText } from '@/core/services/audio/transcription';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const languageRaw = formData.get('language');
    const language =
      languageRaw === 'en' || languageRaw === 'nl' || languageRaw === 'fr' ? languageRaw : 'fr';

    if (!audioFile) {
      return NextResponse.json({ error: 'Fichier audio manquant' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call OpenAI Whisper API to get highly accurate transcription
    const client = getClient();
    const transcript = await transcribeAudioToText(client, buffer, audioFile.name || 'audio.webm', {
      language,
    });

    return NextResponse.json({ success: true, text: transcript });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[transcribe-blob]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
