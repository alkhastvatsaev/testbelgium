import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore, isConfigured } from "@/core/config/firebase";
import { CLIENT_PORTAL_PROFILE_COLLECTION } from "@/features/auth/clientPortalConstants";

const DEFAULT_COMPANY_ID =
  typeof process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID === "string"
    ? process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID.trim() || null
    : null;

/**
 * Upsert profil portail client (nom, e-mail, société, rôle).
 * Préserve `companyId` et `role` existants s’ils ont été posés côté admin.
 */
export async function syncClientPortalProfile(user: User): Promise<void> {
  if (!isConfigured || !firestore) return;

  const ref = doc(firestore, CLIENT_PORTAL_PROFILE_COLLECTION, user.uid);
  let existingCompanyId: string | null = null;
  let existingRole = "client";

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data() as { companyId?: unknown; role?: unknown };
      if (typeof d.companyId === "string" && d.companyId.trim()) existingCompanyId = d.companyId.trim();
      if (typeof d.role === "string" && d.role.trim()) existingRole = d.role.trim();
    }
  } catch {
    /* ignore */
  }

  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? user.email?.split("@")[0] ?? null,
      photoURL: user.photoURL ?? null,
      companyId: existingCompanyId ?? DEFAULT_COMPANY_ID,
      role: existingRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
