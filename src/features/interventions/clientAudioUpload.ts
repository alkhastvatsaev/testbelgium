import { signInAnonymously } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, isConfigured, storage } from "@/core/config/firebase";

/**
 * Sauvegarde fichiers sous `.demo-data/` ou `/public` : OK en `next dev` uniquement.
 * Sur Vercel (serverless), le disque n’est pas persistant ni partagé → toujours utiliser Firebase Storage.
 */
export function allowDemoFilesystemAudio(): boolean {
  return process.env.NODE_ENV === "development";
}

async function ensureUserForAudioUpload() {
  if (!isConfigured || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

function extFromBlob(blob: Blob): string {
  const mime = blob.type || "audio/webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/** Upload vocal vers Firebase Storage (production / Vercel). */
export async function uploadInterventionAudioToFirebase(blob: Blob): Promise<{
  url: string;
  storagePath: string;
  mime: string;
} | null> {
  if (!storage) return null;
  try {
    const user = await ensureUserForAudioUpload();
    if (!user) return null;
    const mime = blob.type || "audio/webm";
    const ext = extFromBlob(blob);
    const storagePath = `interventions_audio/${user.uid}/${Date.now()}.${ext}`;
    const r = ref(storage, storagePath);
    await uploadBytes(r, blob, { contentType: mime });
    const url = await getDownloadURL(r);
    return { url, storagePath, mime };
  } catch (e) {
    console.error("[uploadInterventionAudioToFirebase]", e);
    return null;
  }
}

/** N’inscrit pas d’URL `/api/demo/...` en prod (illisible après déploiement). */
export function isPersistableClientAudioUrl(url: string | null | undefined): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  if (u.startsWith("https://") || u.startsWith("http://")) return true;
  if (u.startsWith("data:")) return u.length < 980_000;
  if (u.startsWith("/api/demo/") && allowDemoFilesystemAudio()) return true;
  return false;
}
