import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import '@/core/config/firebase-admin';
import { readAudioUploadBody } from '@/core/services/audio/read-audio-upload-body';
import type { PendingUploadJob } from '@/core/services/audio/process-upload-jobs';
import { runProcessUploadJob } from '@/core/services/audio/run-process-upload-job';

export const runtime = 'nodejs';

/** Ping / préflight : MacroDroid et les clients mobiles n’utilisent pas toujours le navigateur ; utile pour vérifier l’URL et le réseau. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/ai/audio-dispatch',
    methods: ['POST', 'OPTIONS'],
    post: {
      description:
        'Envoyez l’audio en corps brut (fichier binaire) ou en multipart/form-data. Préférez le corps brut + Content-Type application/octet-stream pour MacroDroid.',
      queryParams: { phone: 'optionnel — numéro associé à l’appel' },
    },
    checks: [
      'Même Wi‑Fi que le PC si http://IP:3000, ou URL HTTPS accessible depuis le téléphone',
      'Méthode POST (pas GET)',
      'Corps = contenu du fichier (pas le chemin du fichier en texte)',
    ],
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    if (!phone) {
      console.warn('API audio-dispatch: Aucun numéro de téléphone fourni (?phone=)');
    }

    const ct = request.headers.get('content-type') || '';
    const contentLength = request.headers.get('content-length');
    console.log(
      `[audio-dispatch] POST phone=${phone || 'inconnu'} content-length=${contentLength ?? 'n/a'} content-type=${ct.slice(0, 120) || '(vide)'}`
    );

    const parsed = await readAudioUploadBody(request);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error,
          ...(parsed.hint ? { hint: parsed.hint } : {}),
          debug: {
            contentType: ct || '(vide)',
            contentLengthHeader: contentLength ?? '(absent)',
          },
        },
        { status: parsed.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { buffer, fileName } = parsed;
    console.log(`[audio-dispatch] Réception audio ${phone || 'inconnu'}, taille: ${buffer.length} octets`);

    const receivedAt = new Date().toISOString();

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    let ext = path.extname(fileName) || '.m4a';
    const phoneSegment = phone ? phone.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';
    const safeBase = `call-${phoneSegment}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let rootRel = `${safeBase}${ext}`;
    let savedPath = path.join(uploadsDir, rootRel);
    fs.writeFileSync(savedPath, buffer);

    let publicUrl = `/uploads/${rootRel}`;

    try {
      if (admin.apps.length) {
        const db = admin.firestore();
        const dispPhone = phone?.trim() ? phone.trim() : null;
        await db.collection('ai_status').doc('macrodroid').set(
          {
            status: 'processing',
            transcript: '',
            phone: dispPhone,
            audioUrl: publicUrl,
            updatedAt: receivedAt,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('[audio-dispatch] Firestore (processing):', e);
    }

    const stem = path.basename(rootRel, path.extname(rootRel));
    const job: PendingUploadJob = {
      stem,
      canonical: rootRel,
      mtimeMs: fs.statSync(savedPath).mtimeMs,
    };

    void runProcessUploadJob({
      uploadsDir,
      job,
      source: 'audio-dispatch',
      dispatchPhone: phone,
    }).catch((err) => console.error('[audio-dispatch] Traitement async:', err));

    const processedAt = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        phone: phone || null,
        audioUrl: publicUrl,
        savedBytes: buffer.length,
        receivedAt,
        processedAt,
        status: 'En traitement',
        message:
          'Fichier enregistré. Transcription lancée en arrière-plan — la PWA se mettra à jour (carte + panneau MacroDroid).',
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur';
    console.error('Erreur API audio-dispatch:', error);
    return NextResponse.json(
      { success: false, error: message },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
