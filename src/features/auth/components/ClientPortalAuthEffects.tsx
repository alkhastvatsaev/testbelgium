"use client";

import { useCallback, useEffect, useState } from "react";
import { getRedirectResult, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { auth, isConfigured } from "@/core/config/firebase";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { CLIENT_PORTAL_AUTH_SLOT_INDEX, EMAIL_LINK_STORAGE_KEY } from "@/features/auth/clientPortalConstants";
import { syncClientPortalProfile } from "@/features/auth/clientPortalProfile";

/** OAuth redirect + finalisation magic link (doit vivre sous `DashboardPagerProvider`).
 *  Affiche une modale de confirmation d'email si le lien magique est détecté sans localStorage. */
export default function ClientPortalAuthEffects() {
  const pager = useDashboardPagerOptional();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!auth || !isConfigured || typeof window === "undefined") return;

    void (async () => {
      try {
        const rr = await getRedirectResult(auth);
        if (rr?.user) {
          await syncClientPortalProfile(rr.user);
          pager?.setPageIndex(CLIENT_PORTAL_AUTH_SLOT_INDEX);
          return;
        }
      } catch (e) {
        console.warn("[ClientPortalAuthEffects] getRedirectResult", e);
      }

      try {
        if (!isSignInWithEmailLink(auth, window.location.href)) return;

        const storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY)?.trim() ?? "";
        if (storedEmail) {
          const cred = await signInWithEmailLink(auth, window.location.href, storedEmail);
          await syncClientPortalProfile(cred.user);
          window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
          window.history.replaceState({}, "", window.location.pathname);
          pager?.setPageIndex(CLIENT_PORTAL_AUTH_SLOT_INDEX);
        } else {
          setShowEmailModal(true);
        }
      } catch (e) {
        console.error("[ClientPortalAuthEffects] email link", e);
      }
    })();
  }, [pager]);

  const handleConfirmEmail = useCallback(async () => {
    if (!auth || !confirmEmail.trim()) return;
    setConfirming(true);
    try {
      const cred = await signInWithEmailLink(auth, window.location.href, confirmEmail.trim());
      await syncClientPortalProfile(cred.user);
      window.history.replaceState({}, "", window.location.pathname);
      pager?.setPageIndex(CLIENT_PORTAL_AUTH_SLOT_INDEX);
      toast.success("Connexion réussie");
    } catch (e) {
      console.error("[ClientPortalAuthEffects] confirm email", e);
      toast.error("E-mail invalide", { description: "Utilisez l'e-mail qui a reçu le lien." });
    } finally {
      setConfirming(false);
    }
  }, [confirmEmail, pager]);

  return (
    <>
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="relative mx-4 w-full max-w-sm rounded-[28px] border border-white/30 bg-white/90 px-6 py-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] backdrop-blur-2xl"
            >
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-5 flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Confirmez votre e-mail
                </h2>
                <p className="text-center text-sm text-slate-500">
                  Saisissez l&apos;adresse e-mail qui a reçu le lien de connexion.
                </p>
              </div>

              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="vous@exemple.be"
                autoFocus
                className="mb-4 w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
              />

              <button
                type="button"
                disabled={confirming || !confirmEmail.trim()}
                onClick={() => void handleConfirmEmail()}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-45"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
