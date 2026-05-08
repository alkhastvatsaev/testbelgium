"use client";

import { useEffect } from "react";
import { signInAnonymously } from "firebase/auth";
import { toast } from "sonner";
import { auth, isConfigured } from "@/core/config/firebase";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";

/**
 * En dev (`NODE_ENV=development`), prévisualisation UI + Firebase anonyme :
 * les dossiers démo sont servis comme missions assignées au technicien « MANSOUR »
 * (`DEMO_TECHNICIAN_UID`), cf. `useTechnicianAssignments`.
 */
export default function DevPreviewAnonymousAuth() {
  useEffect(() => {
    if (!devUiPreviewEnabled || !isConfigured || !auth) return;
    if (auth.currentUser) return;
    void signInAnonymously(auth).catch((err) => {
      console.warn("[DevPreviewAnonymousAuth] signInAnonymously failed", err);
      toast.error("Session Firebase (mode dev)", {
        description:
          "Activez le fournisseur « Anonyme » dans Firebase Console (Authentication → Sign-in method) et vérifiez .env.local.",
        duration: 12_000,
      });
    });
  }, []);

  return null;
}
