"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { auth, app, firestore, isConfigured } from "@/core/config/firebase";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import { isFirebasePublicConfigured } from "@/features/notifications/firebasePublicConfig";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
} from "@/features/interventions/technicianHubNavigation";

export type FcmUiStatus =
  | "idle"
  | "unsupported"
  | "blocked"
  | "needs_vapid"
  | "needs_sign_in"
  | "registering"
  | "registered"
  | "error";

const SW_READY_MS = 14_000;

/** FCM exige un service worker actif (Workbox injecte Firebase Messaging dans `public/sw.js`). */
async function resolvePushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non supporté par ce navigateur.");
  }
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Aucun service worker actif. En développement : arrêtez le serveur puis relancez avec « npm run dev:pwa » ou ENABLE_PWA_IN_DEV=true. Sinon testez avec « npm run build » puis « npm start » (HTTPS en prod).",
          ),
        );
      }, SW_READY_MS);
    }),
  ]);
}

function tokenDocId(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (Math.imul(31, h) + token.charCodeAt(i)) | 0;
  }
  return `w_${Math.abs(h).toString(36)}`;
}

async function persistToken(uid: string, token: string): Promise<void> {
  if (!firestore) throw new Error("Firestore indisponible");
  await setDoc(doc(firestore, "users", uid, "fcm_tokens", tokenDocId(token)), {
    token,
    platform: "web",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Enregistre le jeton FCM sous `users/{uid}/fcm_tokens/{id}` et écoute les messages au premier plan.
 */
export function useTechnicianPushMessaging(vapidKey: string | undefined, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled !== false;
  const pager = useDashboardPagerOptional();
  const { setPendingCaseId } = useTechnicianCaseIntent();

  const [status, setStatus] = useState<FcmUiStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const unsubForegroundRef = useRef<(() => void) | undefined>(undefined);

  const openCaseFromPayload = useCallback(
    (interventionId: string | undefined) => {
      if (!interventionId?.trim()) return;
      navigateTechnicianHub(pager, TECHNICIAN_HUB_ANCHOR_MISSIONS);
      setPendingCaseId(interventionId.trim());
    },
    [pager, setPendingCaseId],
  );

  const attachForegroundListener = useCallback(() => {
    if (!app) return;
    unsubForegroundRef.current?.();
    unsubForegroundRef.current = undefined;

    const messaging = getMessaging(app);
    unsubForegroundRef.current = onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "BelgMap";
      const body = payload.notification?.body ?? "";
      toast.message(title, { description: body });
      const id = typeof payload.data?.interventionId === "string" ? payload.data.interventionId : undefined;
      openCaseFromPayload(id);
    });
  }, [app, openCaseFromPayload]);

  const syncTokenForUser = useCallback(
    async (uid: string): Promise<void> => {
      if (!app || !firestore || !vapidKey?.trim()) return;

      const registration = await resolvePushServiceWorkerRegistration();
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: vapidKey.trim(),
        serviceWorkerRegistration: registration,
      });

      if (!token) throw new Error("Jeton FCM vide");

      await persistToken(uid, token);
      setStatus("registered");
      setLastError(null);
      attachForegroundListener();
    },
    [app, firestore, vapidKey, attachForegroundListener],
  );

  useEffect(() => {
    unsubForegroundRef.current?.();
    unsubForegroundRef.current = undefined;

    if (!enabled || !isConfigured || !app || !firestore || !auth || !isFirebasePublicConfigured()) {
      setStatus("unsupported");
      return () => {};
    }

    const firebaseAuth = auth;

    if (!vapidKey?.trim()) {
      setStatus("needs_vapid");
      return () => {};
    }

    let unsubAuth: (() => void) | undefined;

    void isSupported().then((supported) => {
      if (!supported) {
        setStatus("unsupported");
        return;
      }

      unsubAuth = onAuthStateChanged(firebaseAuth, (user) => {
        void (async () => {
          setLastError(null);

          if (!user) {
            setStatus("needs_sign_in");
            return;
          }

          if (typeof Notification === "undefined") {
            setStatus("unsupported");
            return;
          }

          if (Notification.permission === "denied") {
            setStatus("blocked");
            return;
          }

          if (Notification.permission !== "granted") {
            setStatus("idle");
            return;
          }

          try {
            setStatus("registering");
            await syncTokenForUser(user.uid);
          } catch (e) {
            console.error("[FCM]", e);
            setStatus("error");
            setLastError(e instanceof Error ? e.message : String(e));
          }
        })();
      });
    });

    return () => {
      unsubAuth?.();
      unsubForegroundRef.current?.();
      unsubForegroundRef.current = undefined;
    };
  }, [enabled, vapidKey, app, firestore, auth, syncTokenForUser]);

  const registerPush = useCallback(async () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      setStatus("needs_sign_in");
      return;
    }
    if (!app || !firestore || !vapidKey?.trim()) return;

    try {
      setStatus("registering");
      setLastError(null);
      if (typeof Notification === "undefined") {
        setStatus("unsupported");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("blocked");
        return;
      }
      if (permission !== "granted") {
        setStatus("idle");
        return;
      }
      await syncTokenForUser(uid);
    } catch (e) {
      console.error("[FCM]", e);
      setStatus("error");
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }, [app, firestore, vapidKey, syncTokenForUser, auth]);

  return useMemo(
    () => ({ status, lastError, registerPush }),
    [status, lastError, registerPush],
  );
}

/** Supprime un jeton en base lorsque l’utilisateur révoque les notifications (best-effort). */
export async function deleteStoredFcmToken(uid: string, token: string): Promise<void> {
  if (!firestore) return;
  await deleteDoc(doc(firestore, "users", uid, "fcm_tokens", tokenDocId(token))).catch(() => null);
}
