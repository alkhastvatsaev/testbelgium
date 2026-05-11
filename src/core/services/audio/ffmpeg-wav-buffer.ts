import { execFileSync } from 'child_process';

/** ~100 Mo — marge pour longs appels WAV 16 kHz mono */
const FFMPEG_STDOUT_MAX = 100 * 1024 * 1024;

/**
 * Décode / convertit un fichier audio en WAV mono 16 kHz en mémoire (aucun fichier .wav sur disque).
 * Utilisé pour les formats non pris en charge tel quel par le STT (ex. .m4a).
 */
export function transcodeFileToWavBuffer(inputPath: string): Buffer | null {
  try {
    const buf = execFileSync(
      'ffmpeg',
      ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-f', 'wav', 'pipe:1'],
      {
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: FFMPEG_STDOUT_MAX,
      }
    );
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}
