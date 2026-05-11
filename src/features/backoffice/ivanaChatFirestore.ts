import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Firestore,
} from "firebase/firestore";

export const IVANA_PORTAL_CHAT_COLLECTION = "portal_ivana_chat_messages";

export type IvanaPortalChatRole = "client" | "staff";

export type IvanaPortalChatDoc = {
  id: string;
  companyId: string;
  body: string;
  role: IvanaPortalChatRole;
  senderUid: string;
  createdAt: unknown;
  
  imageUrls?: string[];
};

export function subscribeIvanaPortalMessages(
  db: Firestore,
  companyId: string,
  onRows: (rows: IvanaPortalChatDoc[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const trimmed = companyId.trim();
  if (!trimmed) {
    onRows([]);
    return () => {};
  }
  const q = query(
    collection(db, IVANA_PORTAL_CHAT_COLLECTION),
    where("companyId", "==", trimmed),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Omit<IvanaPortalChatDoc, "id">;
        return { id: d.id, ...data } as IvanaPortalChatDoc;
      });
      onRows(rows);
    },
    (e) => {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    },
  );
}

export async function sendIvanaPortalMessage(
  db: Firestore,
  params: {
    companyId: string;
    body: string;
    role: IvanaPortalChatRole;
    senderUid: string;
    imageUrls?: string[];
  },
): Promise<void> {
  await addDoc(collection(db, IVANA_PORTAL_CHAT_COLLECTION), {
    companyId: params.companyId.trim(),
    body: params.body,
    role: params.role,
    senderUid: params.senderUid,
    createdAt: serverTimestamp(),
    ...(params.imageUrls && params.imageUrls.length > 0 ? { imageUrls: params.imageUrls } : {}),
  });
}
