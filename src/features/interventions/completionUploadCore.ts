import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, firestore, storage } from "@/core/config/firebase";
import { dataUrlToBlob } from "@/features/interventions/finishJobCapture";

/** Upload Storage + mise à jour Firestore (réseau requis pour Storage). */
export async function performCompletionUpload(params: {
  interventionId: string;
  photoDataUrls: string[];
  signaturePngDataUrl: string;
}): Promise<void> {
  const { interventionId, photoDataUrls, signaturePngDataUrl } = params;
  if (!storage || !firestore || !auth?.currentUser) {
    throw new Error("Firebase indisponible");
  }
  const uid = auth.currentUser.uid;
  const basePath = `interventions/${interventionId}/completion`;
  const ts = Date.now();

  const photoUrls: string[] = [];
  for (let i = 0; i < photoDataUrls.length; i++) {
    const blob = dataUrlToBlob(photoDataUrls[i]);
    const r = ref(storage, `${basePath}/${uid}_${ts}_${i}.jpg`);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    photoUrls.push(await getDownloadURL(r));
  }

  const sigBlob = dataUrlToBlob(signaturePngDataUrl);
  const sigRef = ref(storage, `${basePath}/${uid}_${ts}_signature.png`);
  await uploadBytes(sigRef, sigBlob, { contentType: "image/png" });
  const sigUrl = await getDownloadURL(sigRef);

  await updateDoc(doc(firestore, "interventions", interventionId), {
    completionPhotoUrls: photoUrls,
    completionSignatureUrl: sigUrl,
    completedAt: serverTimestamp(),
    completedByUid: uid,
    status: "done",
  });
}
