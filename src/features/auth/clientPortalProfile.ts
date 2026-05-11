import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore, isConfigured } from "@/core/config/firebase";
import { CLIENT_PORTAL_PROFILE_COLLECTION } from "@/features/auth/clientPortalConstants";

const DEFAULT_COMPANY_ID =
  typeof process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID === "string"
    ? process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID.trim() || null
    : null;

/** Champs optionnels sur `allowed_users/{phone}` pour aligner le chat IVANA sur la société (prioritaire pour la synchro téléphone). */
export function companyIdFromAllowedUsersDoc(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const keys = ["portalCompanyId", "ivanaChatCompanyId", "companyId"] as const;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export type SyncClientPortalProfileOptions = {
  /** Société issue de la whitelist téléphone — prime sur le profil existant pour éviter les décalages avec `.env`. */
  whitelistCompanyId?: string | null;
};

/**
 * Upsert profil portail client (nom, e-mail, société, rôle).
 * Préserve `companyId` et `role` existants sauf si `whitelistCompanyId` est fourni (connexion téléphone).
 */
export async function syncClientPortalProfile(
  user: User,
  options?: SyncClientPortalProfileOptions,
): Promise<void> {
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

  const ws = options?.whitelistCompanyId?.trim() ?? "";
  const resolvedCompanyId =
    (ws.length > 0 ? ws : existingCompanyId ?? DEFAULT_COMPANY_ID)?.trim() ?? "";
  /** Évite `companyId: null` (les règles chat exigent une chaîne). */
  const companyPayload =
    resolvedCompanyId.length > 0 ? { companyId: resolvedCompanyId } : ({} as Record<string, never>);

  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? user.email?.split("@")[0] ?? null,
      photoURL: user.photoURL ?? null,
      ...companyPayload,
      role: existingRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
