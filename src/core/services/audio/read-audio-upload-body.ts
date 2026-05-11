import { pickLargestUploadBlobFromFormData } from '@/core/services/audio/pick-upload-blob-from-form-data';

export type ReadAudioUploadBodyResult =
  | { ok: true; buffer: Buffer; fileName: string }
  | { ok: false; error: string; status: number; hint?: string };

/** Corps trop petit + préfixe chemin Android → souvent "Texte" avec le path au lieu de "Fichier" dans MacroDroid. */
export function bodyLooksLikeAndroidPathText(buffer: Buffer): boolean {
  if (buffer.length === 0 || buffer.length > 4096) return false;
  const t = buffer.toString('utf8').trim();
  if (t.length < 12) return false;
  if (!/^(\/storage\/|\/sdcard\/|\/data\/|content:\/\/)/i.test(t)) return false;
  const bad = [...t].some((c) => {
    const n = c.charCodeAt(0);
    return n < 32 && n !== 10 && n !== 13;
  });
  return !bad;
}

const HINT_EMPTY = `MacroDroid n’a envoyé aucun octet. Vérifiez : (1) corps = Fichier ou nom de fichier dynamique avec … → {lv=VotreVariable}, pas mode Texte ; (2) script shell avant la requête avec « bloquer jusqu’à la fin » ; (3) tr -d '\\r\\n' sur le chemin ; (4) permission « accès à tous les fichiers » pour MacroDroid.`;

const HINT_PATH_AS_TEXT = `Le corps ressemble à un chemin (texte), pas à l’audio binaire. Dans Requête HTTP : choisissez « Fichier » / « nom de fichier dynamique » et insérez le chemin via … (texte magique), ne pas taper le chemin dans le champ « Texte » du corps.`;

function cancelUnreadClone(fallback: Request) {
  void fallback.body?.cancel?.().catch(() => undefined);
}

/**
 * Lit le corps d’un POST audio pour `/api/ai/audio-dispatch`.
 * - multipart : préfère le plus gros Blob (MacroDroid envoie souvent plusieurs parties).
 * - si le multipart ne donne aucun fichier utilisable (client capricieux), repli sur le corps brut
 *   via une copie de la requête (clone faite avant toute lecture).
 */
export async function readAudioUploadBody(request: Request): Promise<ReadAudioUploadBodyResult> {
  const ct = (request.headers.get('content-type') || '').toLowerCase();

  if (ct.includes('multipart/form-data')) {
    const rawFallback = request.clone();
    try {
      const formData = await request.formData();
      const file = pickLargestUploadBlobFromFormData(formData);
      if (file && file.size > 0) {
        const fileName = (file as File).name || 'audio.m4a';
        const buffer = Buffer.from(await file.arrayBuffer());
        cancelUnreadClone(rawFallback);
        return { ok: true, buffer, fileName };
      }
      const keys = [...new Set([...formData.keys()])];
      console.warn('[readAudioUploadBody] multipart sans Blob utilisable, champs:', keys.join(', ') || '(aucun)');
    } catch (e) {
      console.warn('[readAudioUploadBody] formData erreur:', e);
    }

    const ab = await rawFallback.arrayBuffer();
    const buffer = Buffer.from(ab);
    if (buffer.length === 0) {
      return {
        ok: false,
        error: 'Aucun fichier audio exploitable (multipart vide ou illisible).',
        status: 400,
        hint: HINT_EMPTY,
      };
    }
    console.warn(
      '[readAudioUploadBody] repli corps brut après multipart — vérifiez les réglages MacroDroid (fichier réel, pas seulement le chemin en texte).'
    );
    return { ok: true, buffer, fileName: 'audio.m4a' };
  }

  const ab = await request.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length === 0) {
    return {
      ok: false,
      error: 'Le corps de la requête est vide.',
      status: 400,
      hint: HINT_EMPTY,
    };
  }

  if (bodyLooksLikeAndroidPathText(buffer)) {
    return {
      ok: false,
      error: 'Corps = chemin fichier en texte, pas les données audio.',
      status: 400,
      hint: HINT_PATH_AS_TEXT,
    };
  }

  return { ok: true, buffer, fileName: 'audio.m4a' };
}
