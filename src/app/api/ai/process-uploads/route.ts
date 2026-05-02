import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import '@/core/config/firebase-admin';
import { findPendingUploadJobs } from '@/core/services/audio/process-upload-jobs';
import { runProcessUploadJob } from '@/core/services/audio/run-process-upload-job';

export const runtime = 'nodejs';

/** Limite serveur (Vercel Pro+) — ajuste si besoin */
export const maxDuration = 120;

function clientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || '';
}

async function authorizeProcessUploads(request: Request): Promise<boolean> {
  const secret = process.env.UPLOAD_AUTO_PROCESS_SECRET?.trim();
  const hdr = request.headers.get('x-upload-auto-secret')?.trim();
  if (secret && hdr === secret) return true;

  // Sans secret serveur : on autorise (bureau / dév). Sinon l'endpoint restait en 403 en prod sans Admin Firebase.
  if (!secret) {
    return true;
  }

  const authz = request.headers.get('authorization');
  if (authz?.startsWith('Bearer ') && admin.apps.length) {
    try {
      await admin.auth().verifyIdToken(authz.slice(7));
      return true;
    } catch {
      /* jeton invalide */
    }
  }

  const officeIp = process.env.NEXT_PUBLIC_OFFICE_IP?.trim();
  if (officeIp && process.env.OFFICE_ALLOW_UPLOAD_AUTO_PROCESS === 'true') {
    if (clientIp(request) === officeIp) return true;
  }

  return process.env.NODE_ENV !== 'production';
}

/**
 * Traite au plus un fichier audio dans `public/uploads` sans `.audio.json` à jour.
 * Sécurité en prod : jeton Firebase, secret `UPLOAD_AUTO_PROCESS_SECRET`, ou IP bureau + `OFFICE_ALLOW_UPLOAD_AUTO_PROCESS`.
 */
export async function POST(request: Request) {
  try {
    const ok = await authorizeProcessUploads(request);
    if (!ok) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const pending = findPendingUploadJobs(uploadsDir);

    if (!pending.length) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'Aucun fichier à traiter',
        pending: 0,
      });
    }

    const job = pending[0];
    const out = await runProcessUploadJob({ uploadsDir, job, source: 'upload-auto' });

    return NextResponse.json({
      success: true,
      processed: 1,
      file: job.canonical,
      stem: job.stem,
      pendingAfter: Math.max(0, pending.length - 1),
      data: out.analysis,
      rawTranscript: out.rawTranscript,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[process-uploads] Erreur globale:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET — sonde légère (nombre de jobs en attente), mêmes règles d’auth */
export async function GET(request: Request) {
  const ok = await authorizeProcessUploads(request);
  if (!ok) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const pending = findPendingUploadJobs(uploadsDir);
  return NextResponse.json({ success: true, pending: pending.length });
}
