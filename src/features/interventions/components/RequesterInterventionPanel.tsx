"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRequesterHub } from "../context/RequesterHubContext";
import { ImagePlus, Loader2, MapPin, Mic, SendHorizontal, Trash2, Check, Calendar, Clock, Square, Play, Pause, Download } from "lucide-react";
import { SmartTimeSlotPicker } from "./SmartTimeSlotPicker";
import { toast } from "sonner";
import { addDoc, collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, firestore, isConfigured, storage } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImageToDataUrl } from "@/features/interventions/compressImageToDataUrl";
import {
  REQUESTER_GEOLOC_ADDRESS_PENDING,
  SMART_FORM_TEMPLATES,
  type SmartFormTemplate,
} from "@/features/interventions/smartInterventionConstants";
import { recordDuplicateAlertIfNeeded } from "@/features/interventions/recordDuplicateAlertIfNeeded";
import { resolveInterventionAddressFromCoords } from "@/features/interventions/smartFormReverseGeocode";
import SmartFormAddressAutocomplete from "@/features/interventions/components/SmartFormAddressAutocomplete";
import SmartFormAddressMiniMap from "@/features/interventions/components/SmartFormAddressMiniMap";
import RequesterInterventionStepperHeader from "./RequesterInterventionStepperHeader";
import { useBrowserSpeechDictation } from "@/features/interventions/useBrowserSpeechDictation";
import { capitalizeName } from "@/utils/stringUtils";
import {
  allowDemoFilesystemAudio,
  isPersistableClientAudioUrl,
  uploadInterventionAudioToFirebase,
} from "@/features/interventions/clientAudioUpload";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const SMART_FORM_MAX_PHOTOS = 4;

const inputClass =
  "min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-white/95 px-4 py-3 text-base text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15";

const GEOLOC_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 300_000,
};

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string = "Request timeout"): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function ensureUserForInterventionSubmit() {
  if (!isConfigured) return null;
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await withTimeout(signInAnonymously(auth), 10000, "Auth timeout");
    return cred.user;
  } catch (err) {
    console.error("signInAnonymously error", err);
    return null;
  }
}

const AudioPlayer = ({ blob, onRemove }: { blob: Blob; onRemove: () => void }) => {
  const { t } = useTranslation();
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
        aria-label={String(isPlaying ? t("requester.intervention.audio_pause_aria") : t("requester.intervention.audio_play_aria"))}
      >
        {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
      </button>
      
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div 
            className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500 focus-visible:bg-red-50 focus-visible:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
        aria-label={String(t("requester.intervention.audio_remove_aria"))}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function RequesterInterventionPanel() {
  const {
    profile,
    requestData,
    setRequestData,
    currentStep,
    setCurrentStep,
    isSubmitting,
    setIsSubmitting,
    setLastSubmittedRequest,
    resetAll,
    triggerValidation,
    validationFailedCount,
  } = useRequesterHub();
  const workspace = useCompanyWorkspaceOptional();
  const tenantCompanyId = workspace?.isTenantUser && workspace.activeCompanyId ? workspace.activeCompanyId : null;
  const { t, language } = useTranslation();
  const locale = language === "nl" ? "nl-BE" : language === "en" ? "en-GB" : "fr-BE";
  const [locatingAddress, setLocatingAddress] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    problemTemplateId,
    problemLabel,
    description,
    urgency,
    photoDataUrls,
    interventionAddress,
    interventionLatLng,
    interventionDate,
    interventionTime,
    audioBlob,
  } = requestData;

  useEffect(() => {
    if (!problemTemplateId && problemLabel.includes("smart_form.templates.")) {
      const tpl = SMART_FORM_TEMPLATES.find((x) => x.label === problemLabel);
      if (tpl) {
        setRequestData((prev) => {
          if (prev.problemTemplateId) return prev;
          return {
            ...prev,
            problemTemplateId: tpl.id,
            problemLabel: String(t(tpl.label)),
            description: prev.description.trim() ? prev.description : String(t(tpl.seed)),
          };
        });
      }
      return;
    }
    if (!problemTemplateId) return;
    const tpl = SMART_FORM_TEMPLATES.find((x) => x.id === problemTemplateId);
    if (!tpl) return;
    const nextLabel = String(t(tpl.label));
    setRequestData((prev) => {
      if (prev.problemLabel === nextLabel) return prev;
      return { ...prev, problemLabel: nextLabel };
    });
  }, [language, problemTemplateId, problemLabel, t, setRequestData]);

  // Use profile.defaultAddress if interventionAddress is empty
  useEffect(() => {
    if (!interventionAddress && profile.defaultAddress) {
      setRequestData((prev) => ({ ...prev, interventionAddress: profile.defaultAddress }));
    }
  }, [profile.defaultAddress, interventionAddress, setRequestData]);

  // Voice dictation
  const appendDescriptionFromVoice = useCallback(
    (piece: string) => {
      setRequestData((prev) => {
        const t = prev.description.trimEnd();
        return { ...prev, description: t ? `${t} ${piece}` : piece };
      });
    },
    [setRequestData],
  );

  const handleAudioRecorded = useCallback(async (blob: Blob) => {
    setRequestData((prev) => ({ ...prev, audioBlob: blob }));
    try {
      const firebaseSaved = await uploadInterventionAudioToFirebase(blob);
      if (firebaseSaved) {
        setRequestData((prev) => ({
          ...prev,
          audioUrl: firebaseSaved.url,
        }));
        toast.success(String(t("requester.intervention.audio_recorded_toast")), {
          description: String(t("requester.intervention.audio_saved_cloud_desc")),
        });
        return;
      }

      if (!allowDemoFilesystemAudio()) {
        toast.error(String(t("requester.toasts.voice_save_failed_title")), {
          description: String(t("requester.toasts.voice_save_failed_desc")),
        });
        return;
      }

      const formData = new FormData();
      const mime = blob.type || "audio/webm";
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
      formData.append("audio", blob, `message.${ext}`);

      const res = await fetch("/api/demo/client-audio", { method: "POST", body: formData });
      if (!res.ok) throw new Error(String(t("requester.toasts.server_error")));

      const json = (await res.json().catch(() => null)) as { url?: string; storagePath?: string } | null;
      const savedName =
        json?.url?.split("/").pop() ||
        json?.storagePath?.split("/").pop() ||
        `message.${ext}`;

      if (json?.url) {
        setRequestData((prev) => ({ ...prev, audioUrl: json.url ?? prev.audioUrl }));
      }

      toast.success(String(t("requester.intervention.audio_recorded_toast")), {
        description: savedName,
      });
    } catch (e) {
      console.error("Échec de la sauvegarde audio", e);
      toast.error(String(t("requester.toasts.voice_save_failed_title")), {
        description: String(t("requester.toasts.voice_save_failed_generic")),
      });
    }
  }, [setRequestData, t]);

  const {
    listening: descriptionVoiceListening,
    supported: descriptionVoiceSupported,
    toggleListening: toggleDescriptionVoice,
    interimTranscript,
  } = useBrowserSpeechDictation(appendDescriptionFromVoice, handleAudioRecorded);

  // Geolocation
  const fillAddressFromGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(String(t("requester.toasts.geoloc_unavailable")));
      return;
    }
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setRequestData((prev) => ({
          ...prev,
          interventionLatLng: { lat, lng },
          interventionAddress: REQUESTER_GEOLOC_ADDRESS_PENDING,
        }));
        try {
          const { formatted, location } = await resolveInterventionAddressFromCoords(lat, lng);
          setRequestData((prev) => ({
            ...prev,
            interventionLatLng: location,
            interventionAddress: formatted || "",
          }));
          if (!formatted) {
            toast.message(String(t("requester.toasts.position_saved")), {
              description: String(t("requester.toasts.complete_address_desc")),
            });
          }
        } catch {
          toast.error(String(t("requester.toasts.address_reverse_failed")));
          setRequestData((prev) => ({
            ...prev,
            interventionAddress:
              prev.interventionAddress === REQUESTER_GEOLOC_ADDRESS_PENDING ? "" : prev.interventionAddress,
          }));
        } finally {
          setLocatingAddress(false);
        }
      },
      () => {
        setLocatingAddress(false);
        toast.error(String(t("requester.toasts.location_denied")));
      },
      GEOLOC_OPTIONS,
    );
  }, [setRequestData, t]);

  // Photos
  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const max = SMART_FORM_MAX_PHOTOS;
      const encoded: string[] = [];
      for (const file of list) {
        if (encoded.length >= max) break;
        try {
          encoded.push(await compressImageToDataUrl(file));
        } catch {
          toast.error(String(t("requester.toasts.image_read_failed")));
        }
      }
      setRequestData((prev) => {
        const room = Math.max(0, max - prev.photoDataUrls.length);
        return { ...prev, photoDataUrls: [...prev.photoDataUrls, ...encoded.slice(0, room)] };
      });
    },
    [setRequestData, t],
  );

  const removePhoto = useCallback(
    (idx: number) => {
      setRequestData((prev) => ({
        ...prev,
        photoDataUrls: prev.photoDataUrls.filter((_, i) => i !== idx),
      }));
    },
    [setRequestData],
  );

  // Submit
  const canSubmit =
    interventionAddress.trim() &&
    interventionAddress !== REQUESTER_GEOLOC_ADDRESS_PENDING &&
    (problemLabel.trim() || description.trim()) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (profile.type === "login") {
      const u = auth?.currentUser;
      if (!u || u.isAnonymous) {
        toast.error(String(t("requester.toasts.login_tab_required")));
        return;
      }
    } else {
      const missingProfileFields: string[] = [];
      if (!profile.firstName.trim()) missingProfileFields.push("firstName");
      if (!profile.lastName.trim()) missingProfileFields.push("lastName");
      if (!profile.phone.trim()) missingProfileFields.push("phone");
      if (!profile.defaultAddress.trim()) missingProfileFields.push("defaultAddress");

      if (missingProfileFields.length > 0) {
        triggerValidation();
        toast.error(String(t("requester.toasts.fill_left_panel")));
        return;
      }
    }

    if (!interventionAddress.trim()) {
      toast.error(String(t("requester.toasts.address_required")));
      return;
    }
    if (interventionAddress === REQUESTER_GEOLOC_ADDRESS_PENDING) {
      toast.error(String(t("requester.toasts.address_searching")));
      return;
    }
    if (!problemLabel.trim() && !description.trim()) {
      toast.error(String(t("requester.toasts.problem_required")));
      return;
    }
    if (workspace?.isTenantUser && !tenantCompanyId) {
      toast.error(String(t("requester.toasts.company_required")));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const user = await ensureUserForInterventionSubmit();
      if (!user || !firestore) {
        toast.error(String(t("requester.toasts.auth_failed")));
        return;
      }

      // Démo / filet de sécurité : l'URL peut arriver après le blob (fetch async dans handleAudioRecorded).
      // Sans cette étape, Firestore peut être créé sans audioUrl alors qu'un vocal existe → inbox « Aucun message vocal ».
      let demoAudioUrlForDoc = (requestData.audioUrl ?? "").trim() || null;
      if (!isPersistableClientAudioUrl(demoAudioUrlForDoc)) {
        demoAudioUrlForDoc = null;
      }
      const blobForAudio = requestData.audioBlob;
      if (blobForAudio && blobForAudio.size > 0 && !demoAudioUrlForDoc) {
        try {
          const quick = await uploadInterventionAudioToFirebase(blobForAudio);
          if (quick?.url) {
            demoAudioUrlForDoc = quick.url;
          } else if (allowDemoFilesystemAudio()) {
            const formData = new FormData();
            const mime = blobForAudio.type || "audio/webm";
            const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
            formData.append("audio", blobForAudio, `message.${ext}`);
            const res = await fetch("/api/demo/client-audio", { method: "POST", body: formData });
            if (res.ok) {
              const json = (await res.json()) as { url?: string };
              demoAudioUrlForDoc = (json.url ?? "").trim() || null;
            }
          }
        } catch (e) {
          console.error("Persist vocal at submit failed", e);
        }
      }

      const db = firestore;
      const newDocRef = doc(collection(db, "interventions"));
      const title = (problemLabel.trim() || description.trim()).slice(0, 140);
      const nowIso = new Date().toISOString();
      const hour =
        interventionTime ||
        new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
      const problemForDedupe = description.trim() || problemLabel.trim();

      // BACKGROUND TASK (Ne pas attendre pour débloquer l'interface)
      void (async () => {
        try {
          let lat = interventionLatLng?.lat;
          let lng = interventionLatLng?.lng;
          if (lat === undefined || lng === undefined) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
              const geo = await fetch(`/api/maps/geocode?q=${encodeURIComponent(interventionAddress.trim())}`, { signal: controller.signal });
              const gj = (await geo.json()) as { location?: { lat: number; lng: number } };
              lat = gj.location?.lat ?? 50.8466;
              lng = gj.location?.lng ?? 4.3522;
            } catch (err) {
              lat = 50.8466;
              lng = 4.3522;
            } finally {
              clearTimeout(timeoutId);
            }
          }

          const portalUser =
            profile.type === "login" && auth?.currentUser && !auth.currentUser.isAnonymous
              ? auth.currentUser
              : null;
          let clientFirstRaw = profile.firstName.trim();
          let clientLastRaw = profile.lastName.trim();
          if (portalUser && !clientFirstRaw && !clientLastRaw && portalUser.displayName?.trim()) {
            const parts = portalUser.displayName.trim().split(/\s+/);
            clientFirstRaw = parts[0] ?? "";
            clientLastRaw = parts.slice(1).join(" ");
          }
          const clientPhoneRaw = (profile.phone.trim() || (portalUser?.phoneNumber ?? "").trim());

          await setDoc(newDocRef, {
            title,
            address: interventionAddress.trim(),
            time: hour,
            status: "pending",
            location: { lat, lng },
            urgency,
            problem: problemForDedupe,
            category: "serrurerie",
            createdAt: nowIso,
            createdByUid: user.uid,
            assignedTechnicianUid: null,
            ...(tenantCompanyId ? { companyId: tenantCompanyId } : {}),
            ...(photoDataUrls.length ? { attachmentThumbnails: photoDataUrls.slice(0, SMART_FORM_MAX_PHOTOS) } : {}),
            ...(clientFirstRaw ? { clientFirstName: capitalizeName(clientFirstRaw) } : {}),
            ...(clientLastRaw ? { clientLastName: capitalizeName(clientLastRaw) } : {}),
            ...(clientPhoneRaw ? { clientPhone: clientPhoneRaw } : {}),
            ...(interventionDate ? { requestedDate: interventionDate } : {}),
            ...(interventionTime ? { requestedTime: interventionTime } : {}),
            ...(demoAudioUrlForDoc && isPersistableClientAudioUrl(demoAudioUrlForDoc)
              ? { audioUrl: demoAudioUrlForDoc }
              : {}),
          });

          if (audioBlob && audioBlob.size > 0) {
            const mime = audioBlob.type || "audio/webm";
            const ext = mime.includes("mp4") ? "m4a" : "webm";

            const persistDemoFallback = async () => {
              if (!allowDemoFilesystemAudio()) return;
              try {
                const formData = new FormData();
                formData.append("audio", audioBlob, `message.${ext}`);
                const res = await fetch("/api/demo/client-audio", { method: "POST", body: formData });
                if (!res.ok) return;
                const json = (await res.json()) as { url?: string; mimeType?: string };
                if (json.url) {
                  await setDoc(
                    newDocRef,
                    {
                      audioUrl: json.url,
                      audioMimeType: json.mimeType ?? mime,
                    },
                    { merge: true },
                  );
                }
              } catch (e) {
                console.error("Audio demo fallback failed", e);
              }
            };

            if (storage) {
              try {
                const storagePath = `interventions_audio/${user.uid}/${Date.now()}.${ext}`;
                const audioRef = ref(storage, storagePath);
                await uploadBytes(audioRef, audioBlob);
                const firebaseAudioUrl = await getDownloadURL(audioRef);

                await setDoc(
                  newDocRef,
                  {
                    audioUrl: firebaseAudioUrl,
                    audioStoragePath: storagePath,
                    audioMimeType: mime,
                  },
                  { merge: true },
                );
              } catch (err) {
                console.error("Audio upload failed (Storage)", err);
                await persistDemoFallback();
              }
            } else {
              await persistDemoFallback();
            }
          }

          recordDuplicateAlertIfNeeded({
            db,
            newInterventionId: newDocRef.id,
            companyId: tenantCompanyId,
            address: interventionAddress.trim(),
            problem: problemForDedupe,
            createdByUid: user.uid,
          }).catch(() => null);

          deleteDoc(doc(db, "intervention_request_drafts", user.uid)).catch(() => null);
        } catch (bgErr) {
          console.error("Background submission error:", bgErr);
        }
      })();

      setLastSubmittedRequest({
        problemTemplateId,
        problemLabel,
        description,
        urgency,
        photoDataUrls,
        interventionAddress,
        interventionLatLng,
      });
      resetAll();
      toast.success(String(t("requester.toasts.request_saved")));
    } catch (e) {
      console.error(e);
      toast.error(String(t("requester.toasts.send_failed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProblemSelect = (tpl: SmartFormTemplate) => {
    const labelText = String(t(tpl.label));
    const seedText = String(t(tpl.seed));
    setRequestData((prev) => ({
      ...prev,
      problemTemplateId: tpl.id,
      problemLabel: labelText,
      description: prev.description.trim() ? prev.description : seedText,
    }));
    setCurrentStep(1); // Auto-advance
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -20, filter: "blur(4px)" },
  };

  const springTransition = { type: "spring", bounce: 0, duration: 0.4 } as const;

  return (
    <div data-testid="requester-intervention-panel" style={outfit} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* Body with AnimatePresence */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {currentStep === 0 && (
            <motion.div
              key="step0"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-start px-1 pt-4 pb-28">
                <h2 className="sr-only">{String(t("requester.intervention.step0_heading"))}</h2>
                <div className="-translate-y-3 grid w-full max-w-[440px] grid-cols-3 gap-3 px-1">
                  {SMART_FORM_TEMPLATES.map((tpl) => {
                    const selected =
                      (problemTemplateId ? problemTemplateId === tpl.id : false) ||
                      (!problemTemplateId &&
                        (problemLabel === tpl.label ||
                          problemLabel === String(t(tpl.label))));
                    return (
                      <motion.button
                        key={tpl.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleProblemSelect(tpl)}
                        className={cn(
                          "group relative flex w-full aspect-square flex-col items-center justify-center p-1 text-center outline-none rounded-[22px] transition-all duration-200",
                          selected
                            ? "bg-white border border-blue-200 text-slate-800 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.45)]"
                            : "bg-white border border-black/5 hover:border-blue-200 hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.45)] text-slate-800 shadow-sm",
                        )}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {tpl.labelLines ? (
                            <>
                              <span className="text-sm font-bold tracking-tight leading-snug">
                                {t(tpl.labelLines[0])}
                              </span>
                              <span className="text-sm font-bold tracking-tight leading-snug">
                                {t(tpl.labelLines[1])}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold tracking-tight leading-snug line-clamp-3">
                              {t(tpl.label)}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              role="region"
              aria-labelledby="requester-step1-title"
            >
              <div className="flex flex-col items-center justify-center w-full max-w-sm gap-8 -mt-10">
                <div className="text-center space-y-2">
                  <h3 id="requester-step1-title" className="text-2xl font-bold text-slate-800">
                    {String(t("requester.intervention.step1_title"))}
                  </h3>
                </div>
                
                <button
                  type="button"
                  onClick={toggleDescriptionVoice}
                  disabled={!descriptionVoiceSupported}
                  aria-pressed={descriptionVoiceListening}
                  aria-label={
                    descriptionVoiceListening
                      ? String(t("smart_form.step2.recording"))
                      : String(t("smart_form.step2.pressToSpeak"))
                  }
                  className={cn(
                    "relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 shadow-sm border border-black/5",
                    descriptionVoiceListening
                      ? "bg-red-50 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] scale-110 border-red-200"
                      : "bg-blue-500 text-white shadow-[0_4px_20px_-4px_rgba(59,130,246,0.45)] hover:bg-blue-600 hover:scale-105 border-transparent"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {descriptionVoiceListening ? (
                      <motion.div
                        key="stop"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Square className="h-8 w-8 fill-current" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="mic"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Mic className="h-10 w-10" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {descriptionVoiceListening && (
                    <span className="absolute -bottom-7 text-sm font-bold text-red-500 animate-pulse uppercase tracking-wide">
                      {String(t("requester.intervention.listening"))}
                    </span>
                  )}
                </button>

                <div className="w-full relative mt-4">
                  <textarea
                    value={description}
                    onChange={(e) => setRequestData(prev => ({...prev, description: e.target.value}))}
                    placeholder={String(t("requester.intervention.description_placeholder"))}
                    aria-label={String(t("smart_form.step2.descriptionAria"))}
                    className={cn(
                      inputClass,
                      "min-h-[120px] resize-none text-center p-4 pt-6 w-full bg-slate-50/50 shadow-inner rounded-[24px] text-slate-700"
                    )}
                  />
                  {description && (
                    <button
                      type="button"
                      onClick={() => setRequestData(prev => ({...prev, description: ""}))}
                      aria-label={String(t("common.delete"))}
                      className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {interimTranscript && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-100/80 text-base text-slate-600 italic text-center animate-pulse border border-slate-200">
                      {interimTranscript}
                    </div>
                  )}
                  {audioBlob && !descriptionVoiceListening && (
                    <div className="mt-3 flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                          {String(t("requester.intervention.voice_saved_label"))}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const mime = audioBlob.type || "audio/webm";
                              const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
                              const a = document.createElement("a");
                              const url = URL.createObjectURL(audioBlob);
                              a.href = url;
                              a.download = `message-vocal.${ext}`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                            } catch (e) {
                              console.error(e);
                              toast.error(String(t("requester.intervention.download_failed_toast")));
                            }
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                          aria-label={String(t("requester.intervention.voice_download_aria"))}
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                      <AudioPlayer blob={audioBlob} onRemove={() => setRequestData(prev => ({ ...prev, audioBlob: null }))} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 flex flex-col gap-6 px-10 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex flex-col gap-4 mt-1">
                <h2 className="text-center text-xl font-bold text-slate-800">
                  {String(t("requester.intervention.photos_heading"))}
                </h2>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void ingestFiles(e.target.files);
                    }
                    e.target.value = "";
                  }}
                />
                <div className="grid grid-cols-2 gap-6">
                  {Array.from({ length: SMART_FORM_MAX_PHOTOS }, (_, i) => {
                    const src = photoDataUrls[i];
                    const filled = Boolean(src);
                    const isNextSlot = !filled && i === photoDataUrls.length;

                    return (
                      <div key={i} className="aspect-square relative group">
                        {filled ? (
                          <div className="relative h-full w-full overflow-hidden rounded-[24px] shadow-sm border border-black/5">
                            <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              aria-label={String(t("smart_form.step3.removePhotoAria")).replace(
                                "{n}",
                                String(i + 1),
                              )}
                              className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur-md p-2.5 text-black shadow-sm opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-300 transform scale-90 group-hover:scale-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : isNextSlot ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "flex h-full w-full flex-col gap-2 items-center justify-center rounded-[24px] transition-all duration-300 active:scale-[0.98]",
                              i === 0 && validationFailedCount > 0
                                ? "bg-red-50/50 border-2 border-dashed border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            )}
                          >
                            <div className="rounded-full bg-white shadow-sm p-3 transition-transform duration-300 group-hover:scale-105">
                              <ImagePlus className={cn("h-6 w-6", i === 0 && validationFailedCount > 0 ? "text-red-500" : "text-slate-800")} />
                            </div>
                            <span className="text-base font-bold tracking-tight">
                              {i === 0 && validationFailedCount > 0
                                ? String(t("requester.intervention.photo_required"))
                                : String(t("requester.intervention.photo_add"))}
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[24px] bg-slate-50 border border-black/5">
                            <ImagePlus className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 flex flex-col gap-6 px-10 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex flex-col gap-6">
                <h2 className="text-center text-xl font-bold text-slate-800 px-2">
                  {String(t("smart_form.step4.title"))}
                </h2>
                <SmartTimeSlotPicker
                  companyId={tenantCompanyId}
                  selectedDate={interventionDate || ""}
                  selectedTime={interventionTime || ""}
                  onDateSelect={(date) => setRequestData((prev) => ({ ...prev, interventionDate: date }))}
                  onTimeSelect={(time) => {
                    setRequestData((prev) => ({ ...prev, interventionTime: time }));
                    setCurrentStep(4);
                  }}
                />
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 flex flex-col gap-4 px-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex flex-col gap-2 h-full">

                <div className="flex flex-col gap-1 rounded-[24px] bg-white p-3 shadow-sm border border-black/5 mt-40">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <SmartFormAddressAutocomplete
                        value={interventionAddress}
                        onValueChange={(val) => setRequestData((prev) => ({ ...prev, interventionAddress: val }))}
                        onPlaceSelect={(formatted, loc) =>
                          setRequestData((prev) => ({
                            ...prev,
                            interventionAddress: formatted,
                            interventionLatLng: loc,
                          }))
                        }
                        disabled={locatingAddress}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fillAddressFromGeolocation}
                      disabled={locatingAddress}
                      aria-label={String(t("requester.intervention.locate_aria"))}
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-slate-100 transition-colors hover:bg-slate-200 disabled:opacity-50"
                    >
                      {locatingAddress ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <MapPin className="h-4 w-4 text-slate-800" />
                      )}
                    </button>
                  </div>
                  
                  <div className="relative overflow-hidden rounded-[16px]">
                    <SmartFormAddressMiniMap
                      address={interventionAddress}
                      placeLatLng={interventionLatLng}
                      className="h-[200px] w-full !border-none"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-[16px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" />
                  </div>
                </div>

                <div className="mt-auto pt-4 pb-2">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    className="flex w-fit mx-auto min-w-[280px] px-8 items-center justify-center gap-2 rounded-[20px] bg-black py-4 text-lg font-bold text-white transition hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <SendHorizontal className="h-5 w-5" />
                        {String(t("requester.intervention.submit_request"))}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="shrink-0">
        <RequesterInterventionStepperHeader />
      </div>
    </div>
  );
}
