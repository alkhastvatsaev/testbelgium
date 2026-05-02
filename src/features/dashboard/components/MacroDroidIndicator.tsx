"use client";
import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore as db } from "@/core/config/firebase";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_LAST_PROCESSED = "belgmap_macrodroid_last_processed_at";

export default function MacroDroidIndicator() {
  const [statusData, setStatusData] = useState<Record<string, unknown> | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  /** Déduplique l’affichage : nouvel enregistrement = nouveau `lastProcessedAt` côté serveur */
  const lastProcessedShownRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SESSION_LAST_PROCESSED);
      if (s) lastProcessedShownRef.current = s;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!db) return;

    const unsub = onSnapshot(doc(db, "ai_status", "macrodroid"), (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      if (!data) return;

      const st = data.status;
      if (st === "waiting" || st === "processing") {
        setIsPanelOpen(false);
        setStatusData(null);
        return;
      }

      if (st !== "ready") return;

      const transcript =
        typeof data.transcript === "string" ? data.transcript.trim() : "";
      if (!transcript) return;

      const processedKey =
        (typeof data.lastProcessedAt === "string" && data.lastProcessedAt) ||
        (typeof data.updatedAt === "string" && data.updatedAt) ||
        "";
      if (processedKey && lastProcessedShownRef.current === processedKey) return;

      lastProcessedShownRef.current = processedKey || null;
      try {
        if (processedKey) sessionStorage.setItem(SESSION_LAST_PROCESSED, processedKey);
      } catch {
        /* ignore */
      }

      setStatusData(data);
      setIsPanelOpen(true);
    });

    return () => unsub();
  }, []);

  const transcript =
    statusData && typeof statusData.transcript === "string" ? statusData.transcript.trim() : null;

  return (
    <>
      <AnimatePresence>
        {isPanelOpen && statusData && transcript ? (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999] w-96 overflow-hidden rounded-3xl border-2 border-emerald-400 bg-emerald-950/95 p-6 shadow-[0_0_50px_rgba(16,185,129,0.4)] backdrop-blur-2xl pointer-events-auto"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative z-10 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  RÉSULTAT TRANSCRIPTION
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusData(null);
                  setIsPanelOpen(false);
                }}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-400 transition-all hover:bg-emerald-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="group relative z-10 rounded-2xl border border-white/10 bg-black/60 p-5 shadow-inner transition-all">
              <div
                className="text-xl font-bold leading-relaxed"
                style={{ color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
              >
                &quot;{transcript}&quot;
              </div>
            </div>

            <div className="relative z-10 mt-5 flex items-center justify-between border-t border-emerald-500/20 pt-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold text-emerald-400/60">ENGINE</span>
                <span className="text-[10px] font-bold text-white">OpenAI Transcribe + dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                {typeof statusData.phone === "string" && statusData.phone.trim() !== "" && (
                  <span className="text-[9px] font-mono text-emerald-400/40">{statusData.phone}</span>
                )}
                <div className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  VERIFIED
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
