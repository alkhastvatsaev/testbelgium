"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { firestore, isConfigured } from "@/core/config/firebase";
import type { AudioUploadSidecar } from "@/core/services/audio/transcription.types";
import { addDoc, collection } from "firebase/firestore";
import { extractClientNameFromText, extractDateTimeFromText } from "./transcriptionFormInference";

type DecisionStatus = "none" | "refused" | "created";

type LatestAudioResponse = {
  audio:
    | null
    | {
        name: string;
        url: string;
        createdAt: string;
        transcript: string | null;
        meta?: AudioUploadSidecar;
      };
  decision: { status: DecisionStatus; updatedAt: string | null };
};

type Props = {
  armed: boolean;
  onInterventionCreated?: (mission: { id: number; key: string; clientName: string; coordinates: [number, number]; time: string; status: string; source?: "live"; date?: string }) => void;
  /** Incrémenté à chaque appui sur Play pour ouvrir automatiquement le formulaire */
  openEditSignal?: number;
  /** Si défini : poller `/api/ai/audio-for-url` pour ce clip uniquement (aligné sur la file Galaxy). */
  scopedClipPublicUrl?: string | null;
};

export default function MapTranscriptionActionsPanel({
  armed,
  onInterventionCreated,
  openEditSignal = 0,
  scopedClipPublicUrl,
}: Props) {
  const [latest, setLatest] = useState<LatestAudioResponse | null>(null);
  const [busy, setBusy] = useState<null | "refuse" | "create">(null);
  const [editOpen, setEditOpen] = useState(false);
  /** Évite de rappeler openEdit() à chaque poll /latest-audio (sinon le formulaire efface la saisie). */
  const lastHandledOpenSignalRef = useRef(0);
  const [form, setForm] = useState({
    address: "",
    clientName: "",
    phone: "",
    problem: "",
    urgency: false,
    date: "",
    time: "",
  });

  useEffect(() => {
    if (!armed || scopedClipPublicUrl === undefined) return;
    const s = scopedClipPublicUrl?.trim() ?? "";
    if (s) return;
    setLatest(null);
  }, [armed, scopedClipPublicUrl]);

  useEffect(() => {
    if (!armed) {
      setLatest(null);
      setBusy(null);
      lastHandledOpenSignalRef.current = 0;
      return;
    }

    const useScoped = scopedClipPublicUrl !== undefined;
    const scoped = scopedClipPublicUrl?.trim() ?? "";

    let cancelled = false;

    const tick = async () => {
      try {
        if (useScoped && !scoped) return;
        const endpoint = useScoped
          ? `/api/ai/audio-for-url?url=${encodeURIComponent(scoped)}`
          : "/api/ai/latest-audio";
        const res = await fetch(endpoint);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as LatestAudioResponse;
        if (!cancelled) setLatest(data);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const pollMs =
      Number(process.env.NEXT_PUBLIC_TRANSCRIPT_POLL_MS) > 0
        ? Number(process.env.NEXT_PUBLIC_TRANSCRIPT_POLL_MS)
        : 3000;
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [armed, scopedClipPublicUrl]);

  const canShow =
    Boolean(armed) &&
    Boolean(latest?.audio?.transcript?.trim()) &&
    (latest?.decision?.status ?? "none") === "none";

  const fileName = latest?.audio?.name ?? null;

  const openEdit = useCallback(() => {
    const meta = latest?.audio?.meta;
    const analysis = meta?.analysis;
    const sourceText = analysis?.transcription || meta?.rawTranscript || "";
    const inferredName = extractClientNameFromText(sourceText);
    const inferred = extractDateTimeFromText(sourceText, meta?.receivedAt);
    setForm({
      address: analysis?.adresse?.trim() || "",
      clientName: inferredName,
      phone: typeof meta?.phone === "string" ? meta.phone : "",
      problem: analysis?.probleme?.trim() || "",
      urgency: Boolean(analysis?.urgence),
      date: inferred.date || "",
      time: inferred.time || "",
    });
    setEditOpen(true);
  }, [latest?.audio?.meta]);

  useEffect(() => {
    if (!armed) return;
    if (!openEditSignal || openEditSignal <= lastHandledOpenSignalRef.current) return;
    if (!canShow) return;
    lastHandledOpenSignalRef.current = openEditSignal;
    openEdit();
  }, [armed, openEditSignal, canShow, openEdit]);

  const isValid =
    form.address.trim().length > 0 &&
    form.clientName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.problem.trim().length > 0 &&
    form.date.trim().length > 0 &&
    form.time.trim().length > 0;

  const formatClientName = (raw: string): string => {
    const name = raw.trim();
    if (!name) return "";
    const hasCivility = /^m(\.|me)\s+/i.test(name);
    const base = name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return hasCivility ? base : `M. ${base}`;
  };

  const normalizeTime = (raw: string): string => {
    const t = raw.trim();
    // accepte "YYYY-MM-DD HH:MM" → "HH:MM"
    const parts = t.split(/\s+/);
    const maybe = parts[parts.length - 1] || "";
    return /^\d{2}:\d{2}$/.test(maybe) ? maybe : t;
  };

  const supprimer = useCallback(async () => {
    if (!fileName) {
      setEditOpen(false);
      return;
    }
    setBusy("refuse");
    try {
      await fetch("/api/ai/audio-decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, status: "refused" }),
      }).catch(() => null);
      setLatest((prev) =>
        prev
          ? { ...prev, decision: { status: "refused", updatedAt: new Date().toISOString() } }
          : prev
      );
      setEditOpen(false);
    } finally {
      setBusy(null);
    }
  }, [fileName]);

  const create = useCallback(async () => {
    if (!fileName) return;
    setBusy("create");
    try {
      const res = await fetch("/api/interventions/from-audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, override: form }),
      });
      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | {
              intervention?: {
                clientName?: string | null;
                title?: string;
                status?: string;
                location?: { lat: number; lng: number };
              };
            }
          | null;
        const loc = payload?.intervention?.location;
        if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
          onInterventionCreated?.({
            id: Date.now(),
            key: fileName,
            clientName: formatClientName(form.clientName || payload?.intervention?.clientName || "Client"),
            coordinates: [loc.lng, loc.lat],
            time: normalizeTime(form.time),
            status: payload?.intervention?.status || "À venir",
            source: "live",
            date: form.date.trim(),
          });
        }
        setLatest((prev) =>
          prev
            ? { ...prev, decision: { status: "created", updatedAt: new Date().toISOString() } }
            : prev
        );
        setEditOpen(false);
        return;
      }

      {
        // Fallback local (dev / bureau) quand Firebase Admin n'est pas configuré côté serveur.
        const sidecar = latest?.audio?.meta;
        if (!sidecar || !sidecar.analysis || !isConfigured || !firestore) {
          throw new Error("Erreur création intervention");
        }

        const analysis = sidecar.analysis;
        const address = form.address.trim() || analysis.adresse?.trim() || null;
        const nowIso = new Date().toISOString();
        const doc = {
          title: (form.problem.trim() || analysis.probleme?.trim() || "Intervention serrurerie").slice(0, 140),
          address: address ?? "Adresse inconnue",
          time: form.time.trim(),
          status: address ? "pending" : "pending_needs_address",
          location: { lat: 50.8466, lng: 4.3522 },
          phone: form.phone.trim() || sidecar.phone || null,
          clientName: formatClientName(form.clientName.trim()) || null,
          urgency: Boolean(form.urgency),
          category: analysis.est_serrurerie ? ("serrurerie" as const) : ("autre" as const),
          problem: form.problem.trim() || analysis.probleme?.trim() || null,
          date: form.date.trim() || null,
          hour: form.time.trim() || null,
          transcription: analysis.transcription?.trim() || "",
          audioUrl: sidecar.publicUrl,
          createdAt: nowIso,
        };

        await addDoc(collection(firestore, "interventions"), doc);
        onInterventionCreated?.({
          id: Date.now(),
          key: fileName,
          clientName: doc.clientName || doc.title,
          coordinates: [doc.location.lng, doc.location.lat],
          time: normalizeTime(doc.time),
          status: "À venir",
          source: "live",
          date: form.date.trim(),
        });
        // Enregistrer la décision (Firestore admin si dispo, sinon disque côté serveur)
        await fetch("/api/ai/audio-decision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileName, status: "created" }),
        }).catch(() => null);
      }
      setLatest((prev) =>
        prev
          ? { ...prev, decision: { status: "created", updatedAt: new Date().toISOString() } }
          : prev
      );
      setEditOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  }, [fileName, latest?.audio?.meta, form, onInterventionCreated]);

  return (
    <>
      <AnimatePresence initial={false}>
        {canShow && editOpen ? (
          <motion.div
            data-testid="map-transcription-edit"
            key="map-transcription-edit"
            initial={{ opacity: 0, y: 18, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
            className="pointer-events-auto fixed left-12 top-1/2 z-[90] flex h-[70vh] w-[calc(50vw-35vh-100px+5mm)] -translate-y-1/2 flex-col rounded-[24px] border border-black/10 bg-white/85 p-6 shadow-[0_40px_90px_-22px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
          >
            <div className="custom-scrollbar grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-2">
              <label className="col-span-2">
                <div className="mb-1 text-[11px] font-bold text-slate-700">Adresse</div>
                <input
                  data-testid="edit-address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label>
                <div className="mb-1 text-[11px] font-bold text-slate-700">Nom client</div>
                <input
                  data-testid="edit-clientName"
                  value={form.clientName}
                  onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label>
                <div className="mb-1 text-[11px] font-bold text-slate-700">Téléphone</div>
                <input
                  data-testid="edit-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label className="col-span-2">
                <div className="mb-1 text-[11px] font-bold text-slate-700">Type / Problème</div>
                <input
                  data-testid="edit-problem"
                  value={form.problem}
                  onChange={(e) => setForm((p) => ({ ...p, problem: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label>
                <div className="mb-1 text-[11px] font-bold text-slate-700">Date</div>
                <input
                  data-testid="edit-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label>
                <div className="mb-1 text-[11px] font-bold text-slate-700">Heure</div>
                <input
                  data-testid="edit-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>

              <label className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  data-testid="edit-urgency"
                  type="checkbox"
                  checked={form.urgency}
                  onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.checked }))}
                />
                <span className="text-sm font-bold text-slate-800">Urgence</span>
              </label>
            </div>

            <div className="mt-auto flex w-full flex-shrink-0 gap-3 border-t border-black/10 pt-4">
              <button
                type="button"
                data-testid="edit-delete"
                onClick={() => void supprimer()}
                disabled={busy !== null}
                className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white shadow-[0_10px_28px_rgba(220,38,38,0.35)] transition hover:bg-red-700 disabled:opacity-50"
              >
                Supprimer
              </button>
              <button
                type="button"
                data-testid="edit-create"
                onClick={() => void create()}
                disabled={busy !== null || !isValid}
                className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

