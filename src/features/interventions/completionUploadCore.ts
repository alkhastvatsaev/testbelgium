import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, firestore, storage } from "@/core/config/firebase";
import { dataUrlToBlob } from "@/features/interventions/finishJobCapture";

const UPLOAD_FILE_TIMEOUT_MS = 120_000;
const FIRESTORE_UPDATE_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} — délai dépassé`)), ms);
    }),
  ]);
}

/** Upload Storage + mise à jour Firestore (réseau requis pour Storage). */
export async function performCompletionUpload(params: {
  interventionId: string;
  photoDataUrls: string[];
  signaturePngDataUrl: string;
}): Promise<void> {
  const { interventionId, photoDataUrls, signaturePngDataUrl } = params;
  const st = storage;
  const fs = firestore;
  const user = auth?.currentUser;
  if (!st || !fs || !user) {
    throw new Error("Firebase indisponible");
  }
  const uid = user.uid;
  const basePath = `interventions/${interventionId}/completion`;
  const ts = Date.now();

  /** Uploads en parallèle, chaque fichier borné pour éviter un blocage infini (SDK sans rejet). */
  const photoUrls: string[] = await Promise.all(
    photoDataUrls.map(async (dataUrl, i) => {
      const blob = dataUrlToBlob(dataUrl);
      const r = ref(st, `${basePath}/${uid}_${ts}_${i}.jpg`);
      return withTimeout(
        (async () => {
          await uploadBytes(r, blob, { contentType: "image/jpeg" });
          return getDownloadURL(r);
        })(),
        UPLOAD_FILE_TIMEOUT_MS,
        `Envoi photo ${i + 1}`,
      );
    }),
  );

  const sigBlob = dataUrlToBlob(signaturePngDataUrl);
  const sigRef = ref(st, `${basePath}/${uid}_${ts}_signature.png`);
  const sigUrl = await withTimeout(
    (async () => {
      await uploadBytes(sigRef, sigBlob, { contentType: "image/png" });
      return getDownloadURL(sigRef);
    })(),
    UPLOAD_FILE_TIMEOUT_MS,
    "Envoi signature",
  );

  await withTimeout(
    updateDoc(doc(fs, "interventions", interventionId), {
      completionPhotoUrls: photoUrls,
      completionSignatureUrl: sigUrl,
      completedAt: serverTimestamp(),
      completedByUid: uid,
      status: "done",
    }),
    FIRESTORE_UPDATE_TIMEOUT_MS,
    "Mise à jour du dossier",
  );
}
