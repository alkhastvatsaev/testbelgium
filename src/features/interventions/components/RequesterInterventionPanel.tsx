"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRequesterHub } from "../context/RequesterHubContext";
import { ImagePlus, Loader2, MapPin, Mic, SendHorizontal, Trash2, Check, Calendar, Clock } from "lucide-react";
import { SmartTimeSlotPicker } from "./SmartTimeSlotPicker";
import { toast } from "sonner";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";
import { compressImageToDataUrl } from "@/features/interventions/compressImageToDataUrl";
import { SMART_FORM_TEMPLATES } from "@/features/interventions/smartInterventionConstants";
import { recordDuplicateAlertIfNeeded } from "@/features/interventions/recordDuplicateAlertIfNeeded";
import { resolveInterventionAddressFromCoords } from "@/features/interventions/smartFormReverseGeocode";
import SmartFormAddressAutocomplete from "@/features/interventions/components/SmartFormAddressAutocomplete";
import SmartFormAddressMiniMap from "@/features/interventions/components/SmartFormAddressMiniMap";
import RequesterInterventionStepperHeader from "./RequesterInterventionStepperHeader";
import { useBrowserSpeechDictation } from "@/features/interventions/useBrowserSpeechDictation";
import { capitalizeName } from "@/utils/stringUtils";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const SMART_FORM_MAX_PHOTOS = 4;
const GEOLOC_ADDRESS_PENDING = "Recherche de l'adresse…";

const inputClass =
  "min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-white/95 px-3 py-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15";

const GEOLOC_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 300_000,
};

async function ensureUserForInterventionSubmit() {
  if (!isConfigured) return null;
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.error("signInAnonymously error", err);
    return null;
  }
}



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
  } = useRequesterHub();
  const workspace = useCompanyWorkspaceOptional();
  const tenantCompanyId = workspace?.isTenantUser && workspace.activeCompanyId ? workspace.activeCompanyId : null;
  const { t } = useTranslation();
  const [locatingAddress, setLocatingAddress] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { problemLabel, description, urgency, photoDataUrls, interventionAddress, interventionLatLng, interventionDate, interventionTime } = requestData;

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

  const {
    listening: descriptionVoiceListening,
    supported: descriptionVoiceSupported,
    toggleListening: toggleDescriptionVoice,
    interimTranscript,
  } = useBrowserSpeechDictation(appendDescriptionFromVoice);

  // Geolocation
  const fillAddressFromGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(t("intervention.geoloc_unavailable") || "Géolocalisation indisponible sur cet appareil");
      return;
    }
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setRequestData((prev) => ({ ...prev, interventionLatLng: { lat, lng }, interventionAddress: GEOLOC_ADDRESS_PENDING }));
        try {
          const { formatted, location } = await resolveInterventionAddressFromCoords(lat, lng);
          setRequestData((prev) => ({
            ...prev,
            interventionLatLng: location,
            interventionAddress: formatted || "",
          }));
          if (!formatted) {
            toast.message(t("intervention.address_saved") || "Position enregistrée", {
              description: t("intervention.complete_address") || "Complétez l'adresse si besoin.",
            });
          }
        } catch {
          toast.error(t("intervention.cant_get_address") || "Impossible de récupérer l'adresse");
          setRequestData((prev) => ({
            ...prev,
            interventionAddress: prev.interventionAddress === GEOLOC_ADDRESS_PENDING ? "" : prev.interventionAddress,
          }));
        } finally {
          setLocatingAddress(false);
        }
      },
      () => {
        setLocatingAddress(false);
        toast.error(t("intervention.loc_refused") || "Localisation refusée ou indisponible");
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
          toast.error("Image non lue");
        }
      }
      setRequestData((prev) => {
        const room = Math.max(0, max - prev.photoDataUrls.length);
        return { ...prev, photoDataUrls: [...prev.photoDataUrls, ...encoded.slice(0, room)] };
      });
    },
    [setRequestData],
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
    interventionAddress !== GEOLOC_ADDRESS_PENDING &&
    (problemLabel.trim() || description.trim()) &&
    !isSubmitting;

  const handleSubmit = async () => {
    // Validate profile fields
    const missingProfileFields = [];
    if (!profile.firstName.trim()) missingProfileFields.push("firstName");
    if (!profile.lastName.trim()) missingProfileFields.push("lastName");
    if (!profile.phone.trim()) missingProfileFields.push("phone");
    if (!profile.defaultAddress.trim()) missingProfileFields.push("defaultAddress");
    if (profile.type === "societe" && !profile.companyName.trim()) missingProfileFields.push("companyName");

    if (missingProfileFields.length > 0) {
      triggerValidation();
      toast.error("Veuillez remplir vos informations (Panneau de gauche)");
      return;
    }

    if (!interventionAddress.trim()) {
      toast.error("Adresse requise");
      return;
    }
    if (interventionAddress === GEOLOC_ADDRESS_PENDING) {
      toast.error("Adresse encore en cours de recherche");
      return;
    }
    if (!problemLabel.trim() && !description.trim()) {
      toast.error("Problème requis");
      return;
    }
    if (workspace?.isTenantUser && !tenantCompanyId) {
      toast.error("Société active requise");
      return;
    }
    const user = await ensureUserForInterventionSubmit();
    if (!user || !firestore) return;

    setIsSubmitting(true);
    try {
      let lat = interventionLatLng?.lat;
      let lng = interventionLatLng?.lng;
      if (lat === undefined || lng === undefined) {
        const geo = await fetch(`/api/maps/geocode?q=${encodeURIComponent(interventionAddress.trim())}`);
        const gj = (await geo.json()) as { location?: { lat: number; lng: number } };
        lat = gj.location?.lat ?? 50.8466;
        lng = gj.location?.lng ?? 4.3522;
      }

      const title = (problemLabel.trim() || description.trim()).slice(0, 140);
      const nowIso = new Date().toISOString();
      const hour = interventionTime || new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
      const problemForDedupe = description.trim() || problemLabel.trim();

      const createdRef = await addDoc(collection(firestore, "interventions"), {
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
        ...(tenantCompanyId ? { companyId: tenantCompanyId } : {}),
        ...(photoDataUrls.length ? { attachmentThumbnails: photoDataUrls.slice(0, SMART_FORM_MAX_PHOTOS) } : {}),
        ...(profile.firstName.trim() ? { clientFirstName: capitalizeName(profile.firstName) } : {}),
        ...(profile.lastName.trim() ? { clientLastName: capitalizeName(profile.lastName) } : {}),
        ...(profile.phone.trim() ? { clientPhone: profile.phone.trim() } : {}),
        ...(interventionDate ? { requestedDate: interventionDate } : {}),
        ...(interventionTime ? { requestedTime: interventionTime } : {}),
      });

      await recordDuplicateAlertIfNeeded({
        db: firestore,
        newInterventionId: createdRef.id,
        companyId: tenantCompanyId,
        address: interventionAddress.trim(),
        problem: problemForDedupe,
        createdByUid: user.uid,
      }).catch(() => null);

      await deleteDoc(doc(firestore, "intervention_request_drafts", user.uid)).catch(() => null);

      setLastSubmittedRequest({
        problemLabel,
        description,
        urgency,
        photoDataUrls,
        interventionAddress,
        interventionLatLng,
      });
      resetAll();
      toast.success(t("intervention.request_saved") || "Demande enregistrée");
    } catch (e) {
      console.error(e);
      toast.error(t("intervention.send_failed") || "Envoi impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProblemSelect = (label: string) => {
    setRequestData((prev) => ({ ...prev, problemLabel: label }));
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
              <div className="flex min-h-full flex-1 items-center justify-center py-4">
                <div className="-translate-y-3 grid w-full max-w-[440px] grid-cols-3 gap-3 px-1">
                  {SMART_FORM_TEMPLATES.map((tpl) => {
                    const selected = problemLabel === tpl.label;
                    return (
                      <motion.button
                        key={tpl.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleProblemSelect(tpl.label)}
                        className={cn(
                          "group relative flex w-full aspect-square flex-col items-center justify-center p-1 text-center outline-none rounded-[22px] transition-all duration-200",
                          selected
                            ? "bg-white border border-blue-200 text-slate-800 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.45)]"
                            : "bg-white border border-black/5 hover:border-black/10 text-slate-800 shadow-sm",
                        )}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {tpl.labelLines ? (
                            <>
                              <span className="text-[11px] font-bold tracking-tight leading-tight">
                                {t(tpl.labelLines[0])}
                              </span>
                              <span className="text-[11px] font-bold tracking-tight leading-tight">
                                {t(tpl.labelLines[1])}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold tracking-tight leading-tight line-clamp-3">
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
            >
              <div className="flex flex-col items-center justify-center w-full max-w-sm gap-8 -mt-10">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Décrivez le problème</h3>
                  <p className="text-sm text-slate-500">Appuyez sur le micro et parlez</p>
                </div>
                
                <button
                  type="button"
                  onClick={toggleDescriptionVoice}
                  disabled={!descriptionVoiceSupported}
                  className={cn(
                    "relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 shadow-sm border border-black/5",
                    descriptionVoiceListening
                      ? "bg-red-50 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] scale-110 border-red-200"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:scale-105"
                  )}
                >
                  {descriptionVoiceListening ? (
                    <Loader2 className="h-10 w-10 animate-spin" />
                  ) : (
                    <Mic className="h-10 w-10" />
                  )}
                  {descriptionVoiceListening && (
                    <span className="absolute -bottom-6 text-[11px] font-bold text-red-500 animate-pulse uppercase tracking-wider">
                      Écoute...
                    </span>
                  )}
                </button>

                <div className="w-full relative mt-4">
                  <textarea
                    value={description}
                    onChange={(e) => setRequestData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Votre description s'affichera ici..."
                    className={cn(
                      inputClass,
                      "min-h-[120px] resize-none text-center p-4 pt-6 w-full bg-slate-50/50 shadow-inner rounded-[24px] text-slate-700"
                    )}
                  />
                  {description && (
                    <button 
                      onClick={() => setRequestData(prev => ({...prev, description: ""}))}
                      className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {interimTranscript && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-100/80 text-sm text-slate-600 italic text-center animate-pulse border border-slate-200">
                      {interimTranscript}
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
              className="absolute inset-0 flex flex-col gap-6 px-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex flex-col gap-4 -mt-4">
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
                              className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur-md p-2.5 text-black shadow-sm opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-300 transform scale-90 group-hover:scale-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : isNextSlot ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-full w-full flex-col gap-2 items-center justify-center rounded-[24px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors duration-300 active:scale-[0.98]"
                          >
                            <div className="rounded-full bg-white shadow-sm p-3 transition-transform duration-300 group-hover:scale-105">
                              <ImagePlus className="h-6 w-6 text-slate-800" />
                            </div>
                            <span className="text-[14px] font-bold tracking-tight">Ajouter</span>
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
                <SmartTimeSlotPicker
                  companyId={tenantCompanyId}
                  selectedDate={interventionDate || ""}
                  selectedTime={interventionTime || ""}
                  onDateSelect={(date) => setRequestData((prev) => ({ ...prev, interventionDate: date }))}
                  onTimeSelect={(time) => setRequestData((prev) => ({ ...prev, interventionTime: time }))}
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
                <div className="flex flex-col gap-3 rounded-[24px] bg-white p-3 shadow-sm border border-black/5">
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
                      aria-label="Utiliser ma position"
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
                    className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-black py-4 text-[16px] font-bold text-white transition hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <SendHorizontal className="h-5 w-5" />
Envoyer la demande
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
