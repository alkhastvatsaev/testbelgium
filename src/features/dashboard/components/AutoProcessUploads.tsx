"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/core/config/firebase";

/** Sauvegarde manuelle / autres clients : relève les fichiers sans sidecar. Après MacroDroid, le traitement part surtout depuis `audio-dispatch`. */
const INTERVAL_MS = Number(process.env.NEXT_PUBLIC_PROCESS_UPLOADS_INTERVAL_MS) || 15_000;

async function postProcessUploads(): Promise<void> {
  const headers: Record<string, string> = {};
  if (auth?.currentUser) {
    try {
      headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    } catch {
      /* ignore */
    }
  }
  const res = await fetch("/api/ai/process-uploads", { method: "POST", headers, credentials: "same-origin" });
  if (!res.ok && process.env.NODE_ENV === "development") {
    const text = await res.text().catch(() => "");
    console.warn("[AutoProcessUploads]", res.status, text);
  }
}

/**
 * Tant que le dashboard est ouvert : demande au serveur de traiter les nouveaux fichiers
 * dans `public/uploads` (création des `*.audio.json`). Un fichier par requête.
 */
export default function AutoProcessUploads() {
  useEffect(() => {
    const run = () => {
      void postProcessUploads();
    };

    let interval: ReturnType<typeof setInterval> | null = null;
    const boot = setTimeout(run, 1_500);

    if (auth) {
      const unsub = onAuthStateChanged(auth, () => {
        run();
      });
      interval = setInterval(run, INTERVAL_MS);
      return () => {
        clearTimeout(boot);
        if (interval) clearInterval(interval);
        unsub();
      };
    }

    interval = setInterval(run, INTERVAL_MS);
    return () => {
      clearTimeout(boot);
      if (interval) clearInterval(interval);
    };
  }, []);

  return null;
}
