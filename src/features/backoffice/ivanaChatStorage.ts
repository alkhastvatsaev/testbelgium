import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";

function randomFileSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}


export async function uploadIvanaChatImagesFromDataUrls(
  storage: FirebaseStorage,
  params: { companyId: string; uid: string; dataUrls: string[] },
): Promise<string[]> {
  const trimmed = params.companyId.trim();
  if (!trimmed || params.dataUrls.length === 0) return [];

  const urls: string[] = [];
  for (let i = 0; i < params.dataUrls.length; i++) {
    const blob = await dataUrlToBlob(params.dataUrls[i]);
    const ext = extFromMime(blob.type);
    const fileName = `${Date.now()}-${i}-${randomFileSuffix()}.${ext}`;
    const r = ref(storage, `portal_ivana_chat/${trimmed}/${params.uid}/${fileName}`);
    const contentType =
      blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    await uploadBytes(r, blob, { contentType });
    urls.push(await getDownloadURL(r));
  }
  return urls;
}
