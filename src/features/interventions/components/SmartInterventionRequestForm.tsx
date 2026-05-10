"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  Mic,
  Calendar,
  Clock,
  SendHorizontal,
  Trash2,
  UserRound,
  X,
  Zap,
  Play,
  Pause,
  Download,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { compressImageToDataUrl } from "@/features/interventions/compressImageToDataUrl";
import { PRESENTATION_PRIVACY_MODE } from "@/core/config/presentationMode";
import {
  SMART_FORM_TEMPLATES,
  SMART_INTERVENTION_DRAFT_STORAGE_KEY,
  smartFormAddressEligibleForStep2,
} from "@/features/interventions/smartInterventionConstants";
import { recordDuplicateAlertIfNeeded } from "@/features/interventions/recordDuplicateAlertIfNeeded";
import { resolveInterventionAddressFromCoords } from "@/features/interventions/smartFormReverseGeocode";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import SmartFormAddressMiniMap from "@/features/interventions/components/SmartFormAddressMiniMap";
import SmartFormAddressAutocomplete from "@/features/interventions/components/SmartFormAddressAutocomplete";
import { capitalizeName } from "@/utils/stringUtils";
import { useAudioRecorder } from "@/features/interventions/useAudioRecorder";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/core/config/firebase";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const SMART_FORM_MAX_PHOTOS = 4;

type DraftPayload = {
  address: string;
  problemLabel?: string;
  description: string;
  urgency: boolean;
  photoDataUrls: string[];
  audioBlob?: Blob | null;
  audioTranscription?: string;
  placeLatLng?: { lat: number; lng: number };
  firstName: string;
  lastName: string;
  phone: string;
  scheduledDate?: string;
  scheduledTime?: string;
};

const emptyDraft = (): DraftPayload => ({
  address: "",
  description: "",
  urgency: false,
  photoDataUrls: [],
  firstName: "",
  lastName: "",
  phone: "",
});

type WizardStep = 1 | 2 | 3 | 4 | 5;

function isPayloadEmpty(p: DraftPayload): boolean {
  return (
    !p.address?.trim() &&
    !p.firstName?.trim() &&
    !p.lastName?.trim() &&
    !p.phone?.trim() &&
    !p.description?.trim() &&
    !(p.photoDataUrls?.length ?? 0)
  );
}

function initialStepFromPayload(p: DraftPayload): WizardStep {
  if (isPayloadEmpty(p)) return 1;
  if (!smartFormAddressEligibleForStep2(p.address, p.placeLatLng)) return 1;
  if (!p.description?.trim() && !p.audioBlob && !p.audioTranscription?.trim()) return 2;
  if (!p.photoDataUrls?.length) return 3;
  if (!p.scheduledDate || !p.scheduledTime) return 4;
  return 5;
}

function loadStorageDraft(): { payload: DraftPayload; updatedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SMART_INTERVENTION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: DraftPayload; updatedAt?: number };
    if (!parsed.payload) return null;
    return {
      payload: { ...emptyDraft(), ...parsed.payload },
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

async function ensureUserForInterventionSubmit(): Promise<User | null> {
  if (!isConfigured) {
    toast.error("Firebase non configuré", {
      description:
        "Ajoutez les variables NEXT_PUBLIC_FIREBASE_* dans .env.local (voir .env.example), puis redémarrez npm run dev.",
    });
    return null;
  }
  if (!firestore) {
    toast.error("Base de données indisponible", {
      description: "Vérifiez NEXT_PUBLIC_FIREBASE_PROJECT_ID et la configuration du projet Firebase.",
    });
    return null;
  }
  if (!auth) {
    toast.error("Authentification indisponible", {
      description: "Firebase Auth n’a pas pu s’initialiser. Contrôlez la console et les clés .env.local.",
    });
    return null;
  }
  const existing = auth.currentUser;
  if (existing) return existing;
  if (devUiPreviewEnabled) {
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (e) {
      console.error(e);
      toast.error("Connexion anonyme refusée", {
        description:
          "Firebase Console → Authentication → Sign-in method : activez « Anonyme ». Vérifiez aussi .env.local.",
      });
      return null;
    }
  }
  toast.error("Connectez-vous pour envoyer", {
    description: "Utilisez la connexion par téléphone en haut de l’écran ou le portail client.",
  });
  return null;
}

function createSilentWavBlob(durationMs = 1500): Blob {
  const sampleRate = 8000;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const numSamples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataSize = numSamples * numChannels * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  // data is already zero-filled (silence)

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Haute précision GPS (`enableHighAccuracy: true`) peut bloquer 15–60 s sur bureau / intérieur.
 * Pour remplir une adresse, la position « réseau » (WiFi / triangulation) suffit et répond en ~1–2 s.
 */
const GEOLOC_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 300_000,
};

/** Texte affiché dans le champ pendant le géocodage inverse (PAS l’adresse finale). */
const GEOLOC_ADDRESS_PENDING = "Recherche de l'adresse…";

/** Tuiles récap 2×2 — hauteur fixe (pas aspect-square) pour tenir dans le rail sans pousser la barre d’actions. */
const RECAP_SQUARE_TILE_CLASS =
  "relative flex min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden rounded-[12px] border border-white/85 bg-gradient-to-br from-white/[0.99] via-white/92 to-slate-50/88 p-2.5 shadow-sm backdrop-blur-md ring-1 ring-slate-900/[0.05]";

const RECAP_SQUARE_ICON_CHIP =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-b from-white to-slate-100/90 text-slate-600 shadow-[0_3px_8px_-5px_rgba(15,23,42,0.38),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-black/[0.06]";

const SMART_FORM_CONTACT_INPUT_CLASS =
  "w-full rounded-[14px] border border-black/[0.06] bg-white/95 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-medium focus-visible:ring-2 focus-visible:ring-slate-900/15";

const SMART_FORM_CONTACT_LABEL_CLASS =
  "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500";

const AudioPlayer = ({ blob, onRemove }: { blob: Blob; onRemove: () => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (!(blob instanceof Blob)) return;
    let url = "";
    try {
      url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
      }
    } catch (e) {
      console.error("Failed to create object URL:", e);
      // Fallback pour Safari iOS quand le blob est vide ou corrompu
      const reader = new FileReader();
      reader.onload = () => {
        if (audioRef.current) {
          audioRef.current.src = reader.result as string;
        }
      };
      reader.readAsDataURL(blob);
    }
    
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [blob]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const downloadBlob = () => {
    try {
      const mime = blob.type || "audio/webm";
      const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `message-vocal.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      toast.error("Téléchargement impossible");
    }
  };

  return (
    <div className="flex w-full items-center gap-3 rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />
      <button 
        type="button"
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:scale-105 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900/20"
        aria-label={isPlaying ? "Mettre en pause" : "Lire l'audio"}
      >
        {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div 
            className="absolute left-0 top-0 h-full bg-slate-900 transition-all duration-100"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold tracking-wider text-slate-400">
          <span>{formatTime(progress)}</span>
          <span>{duration > 0 ? formatTime(duration) : "0:00"}</span>
        </div>
      </div>
      <div className="h-8 w-px bg-slate-100" />
      <button
        type="button"
        data-testid="smart-form-audio-download"
        onClick={downloadBlob}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
        aria-label="Télécharger le message vocal"
      >
        <Download className="h-4 w-4" />
      </button>
      <button 
        type="button"
        onClick={onRemove}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/20"
        aria-label="Supprimer le vocal"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function SmartInterventionRequestForm() {
  const workspace = useCompanyWorkspaceOptional();
  const tenantCompanyId =
    workspace?.isTenantUser && workspace.activeCompanyId ? workspace.activeCompanyId : null;

  const stored = typeof window !== "undefined" ? loadStorageDraft() : null;
  const initialPayload = stored ? { ...emptyDraft(), ...stored.payload } : emptyDraft();
  const [address, setAddress] = useState(initialPayload.address);
  const [description, setDescription] = useState(initialPayload.description ?? "");
  const [urgency, setUrgency] = useState(initialPayload.urgency);
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>(initialPayload.photoDataUrls ?? []);
  const [placeLatLng, setPlaceLatLng] = useState<{ lat: number; lng: number } | undefined>(
    initialPayload.placeLatLng,
  );
  const [firstName, setFirstName] = useState(initialPayload.firstName ?? "");
  const [lastName, setLastName] = useState(initialPayload.lastName ?? "");
  const [phone, setPhone] = useState(initialPayload.phone ?? "");
  const [scheduledDate, setScheduledDate] = useState(initialPayload.scheduledDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(initialPayload.scheduledTime ?? "");
  const [audioTranscription, setAudioTranscription] = useState(initialPayload.audioTranscription ?? "");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(
    initialPayload.audioBlob instanceof Blob ? initialPayload.audioBlob : null
  );
  const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);
  const [demoAudioSaving, setDemoAudioSaving] = useState(false);
  
  const [pregeneratedDocId, setPregeneratedDocId] = useState<string>("");
  const [uploadedAudioInfo, setUploadedAudioInfo] = useState<{
    url: string | null;
    storagePath: string | null;
    mimeType: string | null;
  } | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  useEffect(() => {
    if (firestore && !pregeneratedDocId) {
      setPregeneratedDocId(doc(collection(firestore, "interventions")).id);
    }
  }, [firestore, pregeneratedDocId]);
  
  const audioRecorder = useAudioRecorder();

  // Sync the audio recorder's state into our form's state
  useEffect(() => {
    if (audioRecorder.audioBlob !== null) {
      setAudioBlob(audioRecorder.audioBlob);
    }
    if (audioRecorder.transcription !== "") {
      setAudioTranscription(audioRecorder.transcription);
    }
  }, [audioRecorder.audioBlob, audioRecorder.transcription]);

  // Demo mode: as soon as user stops recording (audioBlob becomes available),
  // save it locally into /public/client-audios/ so back-office can play it immediately.
  useEffect(() => {
    if (!PRESENTATION_PRIVACY_MODE) return;
    if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) return;
    let cancelled = false;
    const controller = new AbortController();

    setDemoAudioSaving(true);
    (async () => {
      try {
        const formData = new FormData();
        const mime = audioBlob.type || "audio/webm";
        const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
        formData.append("audio", audioBlob, `message.${ext}`);
        const res = await fetch("/api/demo/client-audio", { method: "POST", body: formData, signal: controller.signal });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Demo local audio save failed:", res.status, txt);
          if (!cancelled) toast.error("Audio démo", { description: "Impossible d’enregistrer l’audio localement." });
          return;
        }
        const json = (await res.json()) as { url?: string };
        if (!cancelled) setDemoAudioUrl(json.url ?? null);
        // Sanity check: ensure file is visible on disk via GET listing.
        const list = await fetch("/api/demo/client-audio", { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (!cancelled && json.url && list?.files && Array.isArray(list.files)) {
          const name = String(json.url).split("/").pop() || "";
          const exists = list.files.some((f: { name?: string }) => f?.name === name);
          if (!exists) {
            toast.error("Audio démo", { description: "Fichier non trouvé dans public/client-audios." });
          } else {
            toast.success("Audio démo enregistré", { description: name });
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Demo local audio save failed:", e);
        if (!cancelled) toast.error("Audio démo", { description: "Impossible d’enregistrer l’audio localement." });
      } finally {
        if (!cancelled) setDemoAudioSaving(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [audioBlob]);

  const [step, setStep] = useState<WizardStep>(() => initialStepFromPayload(initialPayload));
  const [takenSlots, setTakenSlots] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [recapPhotosOpen, setRecapPhotosOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 5) setRecapPhotosOpen(false);
  }, [step]);

  useEffect(() => {
    if (!recapPhotosOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRecapPhotosOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [recapPhotosOpen]);

  /** Hydratation Firestore si plus récent que localStorage */
  useEffect(() => {
    const db = firestore;
    if (!db || !auth) return;
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || cancelled) return;
      try {
        const snap = await getDoc(doc(db, "intervention_request_drafts", user.uid));
        if (!snap.exists() || cancelled) return;
        const data = snap.data() as { payload?: DraftPayload; updatedAt?: Timestamp };
        const remoteMs = data.updatedAt?.toMillis?.() ?? 0;
        const localMs = loadStorageDraft()?.updatedAt ?? 0;
        if (remoteMs <= localMs) return;
        const p = data.payload;
        if (!p) return;
        const merged = { ...emptyDraft(), ...p };
        setAddress(merged.address);
        setUrgency(Boolean(merged.urgency));
        setPhotoDataUrls(Array.isArray(merged.photoDataUrls) ? merged.photoDataUrls : []);
        setPlaceLatLng(merged.placeLatLng);
        setFirstName(merged.firstName ?? "");
        setLastName(merged.lastName ?? "");
        setPhone(merged.phone ?? "");
        setScheduledDate(merged.scheduledDate ?? "");
        setScheduledTime(merged.scheduledTime ?? "");
        setAudioTranscription(merged.audioTranscription ?? "");
        setStep(initialStepFromPayload(merged));
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** Auto-save brouillon */
  useEffect(() => {
    const payload: DraftPayload = {
      address,
      description,
      urgency,
      photoDataUrls,
      placeLatLng,
      firstName,
      lastName,
      phone,
      scheduledDate,
      scheduledTime,
      audioTranscription,
    };
    const updatedAt = Date.now();
    try {
      localStorage.setItem(
        SMART_INTERVENTION_DRAFT_STORAGE_KEY,
        JSON.stringify({ payload, updatedAt }),
      );
    } catch {
      /* quota */
    }

    const timer = window.setTimeout(async () => {
      const db = firestore;
      const user = auth?.currentUser;
      if (!db || !user) return;
      try {
        await setDoc(
          doc(db, "intervention_request_drafts", user.uid),
          {
            payload,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
      } catch {
        /* hors ligne */
      }
    }, 850);

    return () => window.clearTimeout(timer);
  }, [address, urgency, photoDataUrls, placeLatLng, firstName, lastName, phone, scheduledDate, scheduledTime, audioTranscription]);

  /** Cohérence : sans adresse, revenir à l’étape adresse (1) */
  useEffect(() => {
    if (step > 1 && !address.trim()) setStep(1);
  }, [address, step]);

  /** Chargement des créneaux pris depuis Firestore pour l'étape 5 */
  useEffect(() => {
    if (step !== 5) return;
    const fetchSlots = async () => {
      const db = firestore;
      if (!db) return;
      try {
        let q;
        if (tenantCompanyId) {
          q = query(
            collection(db, "interventions"),
            where("companyId", "==", tenantCompanyId),
            where("status", "in", ["pending", "accepted", "in_progress", "resolved"])
          );
        } else {
          return;
        }
        const snap = await getDocs(q);
        const slots: Record<string, string[]> = {};
        snap.forEach(d => {
          const data = d.data();
          if (data.scheduledDate && data.scheduledTime) {
            if (!slots[data.scheduledDate]) slots[data.scheduledDate] = [];
            slots[data.scheduledDate].push(data.scheduledTime);
          }
        });
        setTakenSlots(slots);
      } catch (err) {
        console.error("Erreur récupération dispos", err);
      }
    };
    void fetchSlots();
  }, [step, tenantCompanyId]);

  const fillAddressFromGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Géolocalisation indisponible sur cet appareil");
      return;
    }
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPlaceLatLng({ lat, lng });
        setAddress(GEOLOC_ADDRESS_PENDING);
        try {
          const { formatted, location } = await resolveInterventionAddressFromCoords(lat, lng);
          setPlaceLatLng(location);
          if (formatted) {
            setAddress(formatted);
          } else {
            setAddress("");
            toast.message("Position enregistrée", { description: "Complétez l'adresse si besoin." });
          }
        } catch {
          toast.error("Impossible de récupérer l'adresse");
          setAddress((prev) => (prev === GEOLOC_ADDRESS_PENDING ? "" : prev));
        } finally {
          setLocatingAddress(false);
          queueMicrotask(() => addressInputRef.current?.focus());
        }
      },
      () => {
        setLocatingAddress(false);
        toast.error("Localisation refusée ou indisponible");
        queueMicrotask(() => addressInputRef.current?.focus());
      },
      GEOLOC_OPTIONS,
    );
  }, []);

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const max = SMART_FORM_MAX_PHOTOS;
    const encoded: string[] = [];
    for (const file of list) {
      if (encoded.length >= max) break;
      try {
        encoded.push(await compressImageToDataUrl(file));
      } catch {
        toast.error("Image non lue");
      }
    }
    setPhotoDataUrls((prev) => {
      const room = Math.max(0, max - prev.length);
      return [...prev, ...encoded.slice(0, room)];
    });
  }, []);

  const removePhoto = useCallback((idx: number) => {
    setPhotoDataUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = async () => {
    if (!address.trim()) {
      toast.error("Adresse requise");
      return;
    }
    let finalAudioBlob = audioRecorder.audioBlob || audioBlob;
    const promiseFunc = audioRecorder.transcriptionPromise;
    const tPromise = promiseFunc ? promiseFunc() : null;
    let finalTranscription = audioTranscription || audioRecorder.transcription;

    if (address === GEOLOC_ADDRESS_PENDING) {
      toast.error("Adresse encore en cours de recherche");
      return;
    }
    if (!description.trim() && !finalAudioBlob && !finalTranscription.trim() && !audioRecorder.isTranscribing) {
      toast.error("Description ou audio requis");
      return;
    }
    if (workspace?.isTenantUser && !tenantCompanyId) {
      toast.error("Société active requise");
      return;
    }
    const user = await ensureUserForInterventionSubmit();
    if (!user || !firestore) return;

    const db = firestore;

    setBusy(true);
    try {
      const newDocRef = doc(collection(db, "interventions"));
      const nowIso = new Date().toISOString();
      const hour = new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

      let lat = placeLatLng?.lat;
      let lng = placeLatLng?.lng;
      if (lat === undefined || lng === undefined) {
        try {
          const geo = await fetch(`/api/maps/geocode?q=${encodeURIComponent(address.trim())}`);
          const gj = (await geo.json()) as { location?: { lat: number; lng: number } };
          lat = gj.location?.lat ?? 50.8466;
          lng = gj.location?.lng ?? 4.3522;
        } catch {
          lat = 50.8466;
          lng = 4.3522;
        }
      }

      let uploadedAudioUrl: string | null = null;
      let uploadedAudioStoragePath: string | null = null;
      let uploadedAudioMimeType: string | null = null;

      // If demo audio was already saved at stop-time, reuse it.
      if (PRESENTATION_PRIVACY_MODE && demoAudioUrl) {
        uploadedAudioUrl = demoAudioUrl;
      }

      // Demo mode: save audio locally into /public/client-audios/ via a local API route,
      // so back-office can always play it without Firebase.
      if (PRESENTATION_PRIVACY_MODE) {
        if (!finalAudioBlob) {
          finalAudioBlob = createSilentWavBlob();
          toast.message("Mode démo", { description: "Audio de démonstration généré automatiquement." });
        }
      }

      if (PRESENTATION_PRIVACY_MODE && !uploadedAudioUrl && finalAudioBlob && finalAudioBlob.size > 0) {
        try {
          const formData = new FormData();
          const mime = finalAudioBlob.type || "audio/webm";
          const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
          formData.append("audio", finalAudioBlob, `message.${ext}`);
          const res = await fetch("/api/demo/client-audio", { method: "POST", body: formData });
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.error("Demo local audio save failed:", res.status, txt);
            toast.error("Audio démo", { description: "Impossible d’enregistrer l’audio localement." });
          } else {
            const json = (await res.json()) as { url?: string; storagePath?: string; mimeType?: string };
            if (json.url) uploadedAudioUrl = json.url;
            if (json.storagePath) uploadedAudioStoragePath = json.storagePath;
            if (json.mimeType) uploadedAudioMimeType = json.mimeType;
          }
        } catch (e) {
          console.error("Demo audio local save failed:", e);
          toast.error("Audio démo", { description: "Impossible d’enregistrer l’audio localement." });
        }
      }

      if (finalAudioBlob && finalAudioBlob.size > 0 && storage) {
        try {
          const mime = finalAudioBlob.type || "audio/webm";
          const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
          // "Dossier" dédié pour tous les audios.
          const storagePath = `intervention-audios/${newDocRef.id}/message.${ext}`;
          const audioRef = ref(storage, storagePath);
          const metadata = { contentType: mime };
          await uploadBytes(audioRef, finalAudioBlob, metadata);
          uploadedAudioStoragePath = storagePath;
          uploadedAudioMimeType = mime;
          try {
            uploadedAudioUrl = await getDownloadURL(audioRef);
          } catch {
            // keep storagePath fallback for back-office resolution
            uploadedAudioUrl = null;
          }
        } catch (uploadErr) {
          console.error("Failed to upload audio blob:", uploadErr);
        }
      }

      // Fallback (demo / offline): store as data URL so technicians can still listen.
      if (!uploadedAudioUrl && finalAudioBlob && finalAudioBlob.size > 0) {
        try {
          // Guard for Firestore 1MB doc limit (data URL expansion factor).
          if (finalAudioBlob.size > 650_000) {
            throw new Error("Audio trop volumineux pour le mode démo");
          }
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onerror = () => resolve(null);
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
            reader.readAsDataURL(finalAudioBlob as Blob);
          });
          if (dataUrl && dataUrl.length < 980_000) {
            uploadedAudioUrl = dataUrl;
          }
        } catch {
          // ignore
        }
      }

      const finalTitle = (description.trim() || finalTranscription || "Demande d'intervention").slice(0, 140);
      const finalProblem = description.trim() || finalTranscription || "Demande d'intervention";

      await setDoc(newDocRef, {
        title: finalTitle,
        address: address.trim(),
        time: hour,
        status: "pending",
        location: { lat, lng },
        urgency,
        problem: finalProblem,
        category: "serrurerie",
        createdAt: nowIso,
        createdByUid: user.uid,
        ...(tenantCompanyId ? { companyId: tenantCompanyId } : {}),
        ...(photoDataUrls.length ? { attachmentThumbnails: photoDataUrls.slice(0, SMART_FORM_MAX_PHOTOS) } : {}),
        ...(firstName.trim() ? { clientFirstName: capitalizeName(firstName) } : {}),
        ...(lastName.trim() ? { clientLastName: capitalizeName(lastName) } : {}),
        ...(phone.trim() ? { clientPhone: phone.trim() } : {}),
        ...(scheduledDate ? { scheduledDate } : {}),
        ...(scheduledTime ? { scheduledTime } : {}),
        ...(uploadedAudioUrl ? { audioUrl: uploadedAudioUrl } : {}),
        ...(uploadedAudioStoragePath ? { audioStoragePath: uploadedAudioStoragePath } : {}),
        ...(uploadedAudioMimeType ? { audioMimeType: uploadedAudioMimeType } : {}),
        ...(finalTranscription ? { transcription: finalTranscription } : {}),
      });

      // BACKGROUND TASK (Ne pas attendre pour la transcription et les doublons)
      void (async () => {
        try {
          if (tPromise) {
            const result = await tPromise;
            if (result && !finalTranscription) {
              await setDoc(newDocRef, {
                transcription: result,
                problem: result,
                title: result.slice(0, 140)
              }, { merge: true });
            }
          }

          await recordDuplicateAlertIfNeeded({
            db,
            newInterventionId: newDocRef.id,
            companyId: tenantCompanyId,
            address: address.trim(),
            problem: finalProblem,
            createdByUid: user.uid,
          }).catch(() => null);

          await deleteDoc(doc(db, "intervention_request_drafts", user.uid)).catch(() => null);
        } catch (bgErr) {
          console.error("Background submission error:", bgErr);
        }
      })();

      localStorage.removeItem(SMART_INTERVENTION_DRAFT_STORAGE_KEY);
      setAddress("");
      setUrgency(false);
      setPhotoDataUrls([]);
      setPlaceLatLng(undefined);
      setFirstName("");
      setLastName("");
      setPhone("");
      setScheduledTime("");
      setAudioTranscription("");
      setAudioBlob(null);
      audioRecorder.resetRecording();
      setStep(1);
      toast.success("Demande enregistrée");
    } catch (e) {
      console.error(e);
      toast.error("Envoi impossible");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    step === 5 &&
    address.trim().length > 0 &&
    (description.trim().length > 0 || audioTranscription.trim().length > 0 || audioBlob !== null) &&
    !(workspace?.isTenantUser && !tenantCompanyId);

  const canContinueAddress =
    address !== GEOLOC_ADDRESS_PENDING && smartFormAddressEligibleForStep2(address, placeLatLng);

  return (
    <div
      data-testid="smart-intervention-form"
      style={outfit}
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        step === 5 ? "gap-1 overflow-hidden" : "gap-4 pb-1",
      )}
      aria-label={`Demande d'intervention, étape ${step} sur 5`}
    >
      <div className="flex items-center justify-between gap-2" aria-hidden>
        <div className="flex flex-1 justify-center gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((s) => (
            <span
              key={s}
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                s === step ? "bg-slate-900" : s < step ? "bg-slate-400" : "bg-slate-200",
              )}
            />
          ))}
        </div>
      </div>

      {step > 1 ? (
        <button
          type="button"
          data-testid="smart-form-back"
          aria-label="Étape précédente"
          onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev))}
          className="flex w-fit items-center gap-1 rounded-[12px] px-2 py-1 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="sr-only">Retour</span>
        </button>
      ) : null}

      {step === 1 ? (
        <div
          className="flex flex-col gap-3"
          role="region"
          aria-label="Étape 1 — Coordonnées & Adresse"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="smart-form-first-name" className={SMART_FORM_CONTACT_LABEL_CLASS}>
                Prénom
              </label>
              <input
                id="smart-form-first-name"
                data-testid="smart-form-first-name"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={SMART_FORM_CONTACT_INPUT_CLASS}
                placeholder="Jean"
              />
            </div>
            <div>
              <label htmlFor="smart-form-last-name" className={SMART_FORM_CONTACT_LABEL_CLASS}>
                Nom
              </label>
              <input
                id="smart-form-last-name"
                data-testid="smart-form-last-name"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={SMART_FORM_CONTACT_INPUT_CLASS}
                placeholder="Dupont"
              />
            </div>
          </div>
          <div>
            <label htmlFor="smart-form-phone" className={SMART_FORM_CONTACT_LABEL_CLASS}>
              Numéro de téléphone
            </label>
            <input
              id="smart-form-phone"
              data-testid="smart-form-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={SMART_FORM_CONTACT_INPUT_CLASS}
              placeholder="+32 470 12 34 56"
            />
          </div>

          <div className="mt-2 h-px w-full bg-slate-200" aria-hidden />

          <div className="relative">
            <label className="block">
              <span className="sr-only">Adresse d&apos;intervention</span>
              <SmartFormAddressAutocomplete
                ref={addressInputRef}
                value={address}
                onValueChange={(next) => {
                  setAddress(next);
                  setPlaceLatLng(undefined);
                }}
                onPlaceSelect={(formatted, latLng) => {
                  setAddress(formatted);
                  setPlaceLatLng(latLng);
                }}
                disabled={locatingAddress}
              />
            </label>
            <button
              type="button"
              data-testid="smart-form-locate"
              disabled={locatingAddress}
              aria-label="Renseigner l’adresse à partir de ma position sur la carte"
              onClick={() => void fillAddressFromGeolocation()}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100/90 hover:text-slate-700 disabled:opacity-45"
            >
              {locatingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <SmartFormAddressMiniMap address={address} placeLatLng={placeLatLng} />
          
          <button
            type="button"
            data-testid="smart-form-continue-address"
            disabled={!canContinueAddress}
            onClick={() => setStep(2)}
            className="min-h-[48px] w-full rounded-[14px] bg-slate-900 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40"
          >
            Continuer
          </button>
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
            <span className="sr-only">Autocomplete Places indisponible sans clé Google Maps</span>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4 items-center" role="region" aria-label="Étape 2 — Description">
          <p className="text-center text-[16px] font-extrabold tracking-tight text-slate-900">
            Décrivez votre problème vocalement
          </p>
          {!audioBlob ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <button
                type="button"
                onClick={audioRecorder.isRecording ? audioRecorder.stopRecording : audioRecorder.startRecording}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30",
                  audioRecorder.isRecording 
                    ? "bg-red-500 text-white animate-pulse shadow-red-500/40" 
                    : "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105"
                )}
              >
                {audioRecorder.isRecording ? (
                  <div className="h-6 w-6 rounded-sm bg-white" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>
              <p className="text-sm font-medium text-slate-500">
                {audioRecorder.isRecording ? "Enregistrement en cours..." : "Appuyez pour parler"}
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3 py-2">
              <AudioPlayer 
                blob={audioBlob} 
                onRemove={() => {
                  audioRecorder.resetRecording();
                  setAudioBlob(null);
                  setAudioTranscription("");
                }} 
              />
            </div>
          )}
          
          {(audioTranscription || audioRecorder.transcription || audioRecorder.interimTranscript || audioRecorder.isTranscribing) && (
            <div className="w-full rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Transcription :</p>
              <p className="text-sm text-slate-700 italic">
                {audioRecorder.isTranscribing 
                  ? "Transcription en cours d'amélioration..." 
                  : `"${audioTranscription || audioRecorder.transcription || audioRecorder.interimTranscript}"`}
              </p>
            </div>
          )}

          <div className="w-full">
            <label className="block">
              <span className="sr-only">Description du problème</span>
              <textarea
                data-testid="smart-form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ou tapez votre description ici..."
                rows={3}
                className="w-full resize-none rounded-[14px] border border-black/[0.06] bg-white/95 py-2.5 px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900/15"
              />
            </label>
          </div>

          <div className="mt-2 flex w-full gap-2">
            <button
              type="button"
              data-testid="smart-form-continue"
              disabled={audioRecorder.isRecording || (!description.trim() && !audioBlob && !audioTranscription.trim() && !audioRecorder.transcription)}
              onClick={() => {
                if (audioRecorder.isRecording) return;
                setStep(3);
              }}
              className="min-h-[48px] w-full rounded-[14px] bg-slate-900 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-3" role="region" aria-label="Étape 3 — Photos">
          <span className="sr-only">Photos</span>
          <div
            data-testid="smart-form-dropzone"
            aria-label={`Ajouter jusqu'à ${SMART_FORM_MAX_PHOTOS} images, glisser-déposer possible`}
            className="mx-auto w-full max-w-md rounded-[18px] border border-black/[0.08] bg-white/60 p-3 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.12)]"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              void ingestFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              data-testid="smart-form-file-input"
              onChange={(e) => {
                const fl = e.target.files;
                if (fl?.length) void ingestFiles(fl);
                e.target.value = "";
              }}
            />
            <ul className="grid grid-cols-2 gap-2" role="list" aria-label="Emplacements photo">
              {Array.from({ length: SMART_FORM_MAX_PHOTOS }, (_, i) => {
                const src = photoDataUrls[i];
                const filled = Boolean(src);
                const isNextSlot =
                  !filled && i === photoDataUrls.length && photoDataUrls.length < SMART_FORM_MAX_PHOTOS;

                return (
                  <li key={i} className="aspect-square min-h-0">
                    {filled ? (
                      <div
                        className="relative h-full w-full overflow-hidden rounded-[14px] border border-black/[0.08] bg-slate-100 shadow-sm"
                        data-testid={`smart-form-photo-slot-${i}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          data-testid={`smart-form-photo-remove-${i}`}
                          aria-label={`Retirer la photo ${i + 1}`}
                          className="absolute right-1 top-1 rounded-lg bg-black/55 p-1.5 text-white outline-none transition hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white/80"
                          onClick={() => removePhoto(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : isNextSlot ? (
                      <button
                        type="button"
                        data-testid={`smart-form-photo-slot-${i}`}
                        aria-label={`Ajouter une image (${i + 1} sur ${SMART_FORM_MAX_PHOTOS})`}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-dashed border-emerald-500/40 bg-emerald-500/[0.05] outline-none transition hover:border-emerald-500/60 hover:bg-emerald-500/[0.08] focus-visible:ring-2 focus-visible:ring-emerald-600/35"
                      >
                        <ImagePlus
                          className="h-9 w-9 shrink-0 text-emerald-700/85"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <div
                        data-testid={`smart-form-photo-slot-${i}`}
                        className="flex h-full w-full items-center justify-center rounded-[14px] border border-dashed border-black/[0.08] bg-white/[0.35]"
                        aria-label={`Emplacement ${i + 1} sur ${SMART_FORM_MAX_PHOTOS}, disponible ensuite`}
                      >
                        <ImagePlus className="h-7 w-7 shrink-0 text-slate-300/90" strokeWidth={1.5} aria-hidden />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            data-testid="smart-form-continue"
            onClick={() => setStep(4)}
            className="min-h-[48px] w-full rounded-[14px] bg-slate-900 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            Continuer
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-4" role="region" aria-label="Étape 4 — Date et Heure">
          <p className="text-center text-[16px] font-extrabold tracking-tight text-slate-900">Quand êtes-vous disponible ?</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1" aria-label="Jours disponibles">
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const isoDate = d.toISOString().split("T")[0];
                const active = scheduledDate === isoDate;
                const dayName = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(d);
                const dayNum = d.getDate();
                const monthName = new Intl.DateTimeFormat("fr-BE", { month: "short" }).format(d);
                return (
                  <button
                    key={isoDate}
                    type="button"
                    onClick={() => {
                      setScheduledDate(isoDate);
                      setScheduledTime("");
                    }}
                    className={cn(
                      "flex min-w-[70px] shrink-0 flex-col items-center justify-center rounded-[16px] border py-2.5 transition-all outline-none",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-md scale-105"
                        : "border-black/[0.06] bg-white/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{dayName}</span>
                    <span className="text-xl font-black">{dayNum}</span>
                    <span className="text-[10px] font-bold uppercase opacity-80">{monthName}</span>
                  </button>
                );
              })}
            </div>

            {scheduledDate ? (
              <div className="mt-2 grid grid-cols-4 gap-2 px-1">
                {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => {
                  const active = scheduledTime === time;
                  const taken = takenSlots[scheduledDate]?.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={taken}
                      onClick={() => setScheduledTime(time)}
                      className={cn(
                        "rounded-[12px] border py-2 text-sm font-bold transition-all outline-none",
                        taken
                          ? "border-transparent bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                          : active
                            ? "border-blue-500 bg-blue-500 text-white shadow-md scale-105"
                            : "border-black/[0.06] bg-white/90 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500 italic mt-4">Veuillez sélectionner une date ci-dessus.</p>
            )}
          </div>

          <button
            type="button"
            data-testid="smart-form-continue"
            disabled={!scheduledDate || !scheduledTime}
            onClick={() => setStep(5)}
            className="mt-2 min-h-[48px] w-full rounded-[14px] bg-slate-900 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      ) : null}

      {step === 5 ? (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          role="region"
          aria-label="Étape 5 — Récapitulatif"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-2 pr-1">
            <div
              data-testid="smart-form-recap-panel"
              className="flex min-w-0 shrink-0 flex-col gap-2 rounded-[16px] bg-gradient-to-b from-slate-100/55 via-white/45 to-white/35 p-2 ring-1 ring-slate-900/[0.04]"
            >
              <div
                className="grid grid-cols-2 gap-2"
                aria-label="Récapitulatif par tuiles"
              >
                <div
                  data-testid="smart-form-recap-contact"
                  role="group"
                  aria-label={`Contact : ${[firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ") || "non renseigné"}${phone.trim() ? `, ${phone.trim()}` : ""}`}
                  className={RECAP_SQUARE_TILE_CLASS}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={RECAP_SQUARE_ICON_CHIP} aria-hidden>
                      <UserRound className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-slate-400">
                      Contact
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {[firstName, lastName].some((s) => s.trim()) || phone.trim() ? (
                      <div className="flex flex-col gap-0.5">
                        {[firstName, lastName].some((s) => s.trim()) ? (
                          <p
                            className="line-clamp-1 break-words text-xs font-semibold leading-tight text-slate-800"
                            title={[firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ")}
                          >
                            {[firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ")}
                          </p>
                        ) : null}
                        {phone.trim() ? (
                          <p className="line-clamp-1 text-[11px] font-medium tabular-nums leading-tight text-slate-700">
                            {phone.trim()}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs font-normal italic leading-snug text-slate-400">Non renseigné</p>
                    )}
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={`Adresse : ${address.trim() || "non renseignée"}`}
                  className={RECAP_SQUARE_TILE_CLASS}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={RECAP_SQUARE_ICON_CHIP} aria-hidden>
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-slate-400">
                      Lieu
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {address.trim() ? (
                      <p
                        className="line-clamp-2 break-words text-[13px] font-bold leading-tight text-slate-800"
                        title={address.trim()}
                      >
                        {address.trim()}
                      </p>
                    ) : (
                      <p className="text-xs font-normal italic leading-snug text-slate-400">Non renseigné</p>
                    )}
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={description.trim() ? `Description : ${description.trim()}` : "Description non renseignée"}
                  className={RECAP_SQUARE_TILE_CLASS}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={RECAP_SQUARE_ICON_CHIP} aria-hidden>
                      <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-slate-400">
                      Détail
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {description.trim() ? (
                      <p
                        className="line-clamp-2 whitespace-pre-wrap break-words text-[11px] font-medium leading-tight text-slate-700"
                        title={description.trim()}
                      >
                        {description.trim()}
                      </p>
                    ) : (
                      <p className="text-xs italic leading-snug text-slate-400">Aucun détail</p>
                    )}
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={audioTranscription ? `Message vocal : ${audioTranscription}` : "Pas de message vocal"}
                  className={RECAP_SQUARE_TILE_CLASS}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={RECAP_SQUARE_ICON_CHIP} aria-hidden>
                      <Mic className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-slate-400">
                      Vocal
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {audioTranscription ? (
                      <p
                        className="line-clamp-2 whitespace-pre-wrap break-words text-[11px] font-medium italic leading-tight text-slate-700"
                        title={audioTranscription}
                      >
                        "{audioTranscription}"
                      </p>
                    ) : audioBlob ? (
                      <p className="text-xs font-medium text-slate-700">Audio enregistré</p>
                    ) : (
                      <p className="text-xs italic leading-snug text-slate-400">Aucun vocal</p>
                    )}
                  </div>
                </div>

                {scheduledDate && scheduledTime && (
                  <div
                    role="group"
                    aria-label={`Créneau prévu : ${scheduledDate} à ${scheduledTime}`}
                    className={cn(RECAP_SQUARE_TILE_CLASS, "col-span-2")}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={RECAP_SQUARE_ICON_CHIP} aria-hidden>
                        <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </span>
                      <span className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-slate-400">
                        Date & Heure
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-800">
                        {new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(scheduledDate))} <span className="font-medium text-slate-500">à {scheduledTime}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                data-testid="smart-form-recap-photos-open"
                aria-label={
                  photoDataUrls.length > 0
                    ? `Agrandir ou parcourir les ${photoDataUrls.length} photo${photoDataUrls.length !== 1 ? "s" : ""}`
                    : "Voir les emplacements photos (aucune image)"
                }
                onClick={() => setRecapPhotosOpen(true)}
                className="group w-full shrink-0 rounded-[12px] border border-slate-200/85 bg-gradient-to-br from-white/95 via-slate-50/65 to-white/88 p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/[0.04] transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <Images className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    Photos
                  </span>
                  <span className="tabular-nums text-[10px] font-semibold text-slate-500">
                    {photoDataUrls.length}/{SMART_FORM_MAX_PHOTOS}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: SMART_FORM_MAX_PHOTOS }, (_, i) => {
                    const src = photoDataUrls[i];
                    const filled = Boolean(src);
                    return (
                      <div
                        key={`recap-photo-preview-${i}`}
                        data-testid={`smart-form-recap-photo-preview-${i}`}
                        aria-hidden={!filled}
                        className={cn(
                          "relative h-10 w-full min-w-0 shrink-0 overflow-hidden rounded-[8px]",
                          filled
                            ? "border border-white/90 bg-white shadow-sm ring-1 ring-black/[0.06]"
                            : "flex items-center justify-center border border-dashed border-slate-300/70 bg-white/60",
                        )}
                      >
                        {filled ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImagePlus className="h-4 w-4 text-slate-400/85" strokeWidth={1.75} aria-hidden />
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
            </div>
          </div>

          {recapPhotosOpen ? (
            <div
              className="fixed inset-0 z-[280] flex items-end justify-center bg-slate-950/50 p-3 pb-4 backdrop-blur-[6px] sm:items-center sm:p-6"
              role="presentation"
              onClick={() => setRecapPhotosOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Photos jointes à la demande"
                data-testid="smart-form-recap-photos-sheet"
                className="max-h-[min(85dvh,34rem)] w-full max-w-md overflow-hidden rounded-[24px] border border-white/35 bg-white/[0.97] shadow-[0_32px_72px_-20px_rgba(15,23,42,0.38),0_0_0_1px_rgba(255,255,255,0.6)_inset] backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
                style={outfit}
              >
                <div className="flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-white/80 to-slate-50/40 px-4 py-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Aperçu</p>
                    <p className="mt-0.5 text-[16px] font-bold tracking-tight text-slate-900">Photos</p>
                  </div>
                  <button
                    type="button"
                    data-testid="smart-form-recap-photos-close"
                    aria-label="Fermer"
                    onClick={() => setRecapPhotosOpen(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-700 transition hover:bg-slate-900/10 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <div className="max-h-[min(70dvh,28rem)] overflow-y-auto bg-gradient-to-b from-slate-50/30 to-white p-4">
                  {photoDataUrls.length > 0 ? (
                    <ul className="mx-auto grid max-w-sm grid-cols-2 gap-3" aria-label="Photos">
                      {photoDataUrls.slice(0, SMART_FORM_MAX_PHOTOS).map((src, i) => (
                        <li
                          key={`recap-modal-${i}-${src.slice(0, 24)}`}
                          className="aspect-square overflow-hidden rounded-[18px] border border-white/90 bg-slate-200 shadow-[0_12px_28px_-10px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04]"
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/80">
                        <ImagePlus className="h-7 w-7 text-slate-400" strokeWidth={1.5} aria-hidden />
                      </div>
                      <p className="max-w-[14rem] text-[14px] font-medium leading-snug text-slate-500">
                        Aucune photo jointe à cette demande
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="relative z-10 mt-2 flex shrink-0 flex-row gap-1.5 pt-1">
            <button
              type="button"
              data-testid="smart-form-urgency"
              aria-pressed={urgency}
              aria-label={urgency ? "Demande marquée urgente" : "Marquer comme urgent"}
              title={urgency ? "Urgent" : "Marquer comme urgent"}
              onClick={() => setUrgency((u) => !u)}
              className={cn(
                "inline-flex min-h-[34px] min-w-0 flex-1 items-center justify-center rounded-[10px] shadow-[0_10px_28px_-22px_rgba(15,23,42,0.4)] backdrop-blur-sm transition ring-1 active:scale-[0.97]",
                urgency
                  ? "border-transparent bg-red-50 text-red-700 ring-red-300/35"
                  : "border-transparent bg-gradient-to-b from-white/98 to-slate-50/92 text-slate-600 ring-black/[0.06] hover:from-white hover:to-white",
              )}
            >
              <span className="text-[13px] font-semibold uppercase tracking-wide">Urgent</span>
            </button>

            <button
              type="button"
              data-testid="smart-form-submit"
              aria-label={busy ? "Envoi en cours" : "Envoyer la demande"}
              title="Envoyer la demande"
              disabled={!canSubmit || busy}
              onClick={() => void handleSubmit()}
              className="inline-flex min-h-[34px] min-w-0 flex-1 items-center justify-center rounded-[10px] bg-slate-900 text-white shadow-[0_16px_36px_-16px_rgba(15,23,42,0.5)] ring-1 ring-white/10 transition hover:bg-slate-800 enabled:active:scale-[0.97] disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : (
                <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
