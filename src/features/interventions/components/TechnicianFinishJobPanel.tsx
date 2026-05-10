"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, ClipboardList, FileSignature, SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { auth, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useOfflineSyncOptional } from "@/context/OfflineSyncContext";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { cn } from "@/lib/utils";
import { capturePhotoFromVideo } from "@/features/interventions/finishJobCapture";
import { PRESENTATION_PRIVACY_MODE } from "@/core/config/presentationMode";
import {
  FINISH_JOB_MAX_PHOTOS,
  FINISH_JOB_MIN_PHOTOS,
} from "@/features/interventions/finishJobConstants";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
} from "@/features/interventions/technicianHubNavigation";
import { finalizeCompletionOfflineAware } from "@/features/interventions/completionUpload";
import InterventionInvoiceButton from "@/features/interventions/components/InterventionInvoiceButton";
import TechnicianSignaturePad, {
  type TechnicianSignaturePadHandle,
} from "@/features/interventions/components/TechnicianSignaturePad";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import { useTechnicianBackofficeReportBridgeOptional } from "@/context/TechnicianBackofficeReportBridgeContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

type WizardStep = "photos" | "signature" | "submitting" | "success";

export default function TechnicianFinishJobPanel() {
  const pager = useDashboardPagerOptional();
  const workspace = useCompanyWorkspaceOptional();
  const { finishJobInterventionId, setFinishJobInterventionId } = useTechnicianFinishJob();
  const offlineSync = useOfflineSyncOptional();
  const backofficeBridge = useTechnicianBackofficeReportBridgeOptional();

  const [step, setStep] = useState<WizardStep>("photos");
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sigRef = useRef<TechnicianSignaturePadHandle>(null);

  const [invoiceChecklistOptimistic, setInvoiceChecklistOptimistic] = useState(false);

  const submitInFlightRef = useRef(false);

  const interventionId = finishJobInterventionId;

  const liveIv = useInterventionLive(interventionId, Boolean(interventionId && step === "success"));
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  useEffect(() => {
    if (!interventionId || step !== "photos") {
      stopCamera();
      return () => {};
    }

    let cancelled = false;
    void navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          void el.play().catch(() => {});
        }
      })
      .catch(() => {
        toast.error("Caméra inaccessible", { description: "Autorisez la caméra ou utilisez HTTPS." });
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [interventionId, step, stopCamera]);

  const captureShot = () => {
    const v = videoRef.current;
    if (!v || photos.length >= FINISH_JOB_MAX_PHOTOS) return;
    try {
      const url = capturePhotoFromVideo(v);
      setPhotos((p) => [...p, url]);
    } catch {
      toast.error("Photo impossible — attendez le flux vidéo.");
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const resetWizard = () => {
    stopCamera();
    setPhotos([]);
    setInvoiceChecklistOptimistic(false);
    sigRef.current?.clear();
    setStep("photos");
  };

  const goDashboard = () => {
    setFinishJobInterventionId(null);
    resetWizard();
    navigateTechnicianHub(pager ?? undefined, TECHNICIAN_HUB_ANCHOR_MISSIONS);
  };

  const submitAll = async () => {
    if (submitInFlightRef.current) return;
    if (!interventionId || !auth?.currentUser) {
      toast.error("Connexion requise");
      return;
    }
    const sig = sigRef.current?.getPngDataUrl();
    if (!sig) {
      toast.error("Signature manquante");
      return;
    }

    submitInFlightRef.current = true;

    try {
      const photoDataUrls = [...photos];
      const signaturePngDataUrl = sig;

      backofficeBridge?.pushReport({
        interventionId,
        photoDataUrls,
        signaturePngDataUrl,
      });

      stopCamera();
      setStep("success");
      setInvoiceChecklistOptimistic(true);

      toast.success("Rapport transmis au back-office", {
        description: "Photos et signature visibles sur la page carte (panneau droit). Sauvegarde cloud en arrière-plan.",
      });

      if (PRESENTATION_PRIVACY_MODE) {
        toast.message("Mode présentation", {
          description: "Sauvegarde cloud désactivée temporairement. Le back-office voit le rapport via le mode démo.",
        });
      } else {
        void finalizeCompletionOfflineAware({
          interventionId,
          photoDataUrls,
          signaturePngDataUrl,
        })
          .then((result) => {
            if (result.outcome === "error") {
              toast.error("Sauvegarde serveur", { description: result.message });
              return;
            }
            if (result.outcome === "queued") {
              toast.message("File hors ligne", {
                description: "Synchronisation automatique dès que le réseau est stable.",
              });
              void offlineSync?.flushNow?.();
            }
          })
          .catch((e) => {
            console.error(e);
            toast.error("Sauvegarde serveur", {
              description: e instanceof Error ? e.message : String(e),
            });
          })
          .finally(() => {
            void offlineSync?.refreshPendingCount();
          });
      }
    } catch (e) {
      console.error(e);
      setStep("signature");
      toast.error("Envoi impossible", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const showInvoiceCta = workspace?.activeRole === "admin";

  const firebaseUnavailable = !isConfigured || !auth;

  if (!interventionId) {
    return (
      <div data-testid="finish-job-empty" style={outfit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex min-h-[260px] flex-col items-center justify-center gap-5 text-center`}>
          <p className="sr-only">
            Aucune intervention sélectionnée. Ouvrez un dossier depuis les missions, puis utilisez Terminer.
          </p>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100/80 shadow-inner">
            <ClipboardList className="h-8 w-8 text-slate-400" aria-hidden />
          </div>
          <p className="max-w-[200px] text-[14px] font-medium leading-relaxed text-slate-500">
            Sélectionnez une mission depuis le tableau de bord pour la clôturer.
          </p>
          <button
            type="button"
            data-testid="finish-job-back-empty"
            onClick={() => navigateTechnicianHub(pager, TECHNICIAN_HUB_ANCHOR_MISSIONS)}
            aria-label="Ouvrir la liste des missions"
            className="mt-2 flex min-h-[48px] items-center justify-center rounded-[16px] bg-slate-900 px-6 text-[14px] font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            Voir les missions
          </button>
        </div>
      </div>
    );
  }

  if (firebaseUnavailable) {
    return (
      <div data-testid="finish-job-offline" style={outfit} className="p-5 text-[13px] font-medium text-amber-900">
        Connexion indisponible — impossible de clôturer.
      </div>
    );
  }

  if (step === "success") {
    return (
      <div data-testid="finish-job-success" style={outfit} className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col items-center gap-5 px-5 py-8 text-center`}>
        <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
        <p className="sr-only">Clôture enregistrée. Photos et signature enregistrées ; dossier marqué comme fait.</p>

        {showInvoiceCta ? (
          <InterventionInvoiceButton
            iv={liveIv}
            optimisticChecklistComplete={invoiceChecklistOptimistic}
            variant="finishSuccess"
          />
        ) : null}

        <button
          type="button"
          data-testid="finish-job-back-dashboard"
          className="flex w-full max-w-sm min-h-[48px] items-center justify-center rounded-[16px] bg-slate-900 px-4 text-white shadow-xl"
          onClick={goDashboard}
          aria-label="Retour aux missions"
        >
          <ClipboardList className="h-6 w-6" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div data-testid="finish-job-panel" style={outfit} className="flex min-h-[400px] flex-1 flex-col overflow-hidden bg-white/60 backdrop-blur-3xl">
      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-5 p-6`}>
        <div className="flex items-center justify-end pb-2">
          <button
            type="button"
            onClick={goDashboard}
            aria-label="Annuler et fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-colors hover:bg-black/10 hover:text-slate-800"
          >
            <span className="sr-only">Fermer</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {step === "photos" ? (
          <>


            <div className="relative mt-2 overflow-hidden rounded-[24px] bg-slate-900 shadow-xl ring-1 ring-black/5">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className={cn(
                  "aspect-[4/3] w-full object-cover opacity-90 transition-opacity duration-300",
                  PRESENTATION_PRIVACY_MODE ? "blur-xl" : null,
                )}
                muted
                playsInline
                autoPlay
                aria-label="Caméra travaux terminés"
              />
              <div className="absolute inset-0 pointer-events-none rounded-[24px] ring-1 ring-inset ring-white/10" />
              {PRESENTATION_PRIVACY_MODE ? (
                <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  Mode présentation
                </div>
              ) : null}
            </div>

            <button
              type="button"
              data-testid="finish-job-capture-btn"
              disabled={photos.length >= FINISH_JOB_MAX_PHOTOS}
              onClick={captureShot}
              aria-label="Capturer une photo"
              className="mt-4 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[24px] bg-slate-900 text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)] transition-all hover:bg-slate-800 hover:shadow-[0_12px_24px_-8px_rgba(15,23,42,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100"
            >
              <Camera className="h-7 w-7" aria-hidden />
              <span className="font-semibold tracking-wide">Capturer</span>
            </button>

            <div data-testid="finish-job-photo-strip" className="flex flex-wrap gap-3 mt-2">
              {photos.map((src, i) => (
                <div key={`${i}-${src.slice(0, 24)}`} className="relative h-20 w-20 overflow-hidden rounded-[16px] border border-black/5 bg-slate-100 shadow-sm transition-transform hover:scale-105">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className={cn("h-full w-full object-cover", PRESENTATION_PRIVACY_MODE ? "blur-lg" : null)}
                  />
                  <button
                    type="button"
                    data-testid={`finish-job-photo-remove-${i}`}
                    aria-label="Supprimer la photo"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-red-500/90"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              data-testid="finish-job-continue-photos"
              disabled={photos.length < FINISH_JOB_MIN_PHOTOS}
              onClick={() => {
                stopCamera();
                setStep("signature");
              }}
              aria-label="Continuer vers la signature"
              className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100 active:scale-[0.98]"
            >
              <span className="font-semibold tracking-wide">Étape suivante</span>
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}

        {step === "signature" ? (
          <div className="flex flex-col flex-1 gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-2 px-1">
              <FileSignature className="h-5 w-5 text-slate-800" aria-hidden />
              <h2 className="text-[15px] font-semibold text-slate-800">Signature client</h2>
            </div>
            <p className="px-1 text-[13px] text-slate-500 leading-relaxed -mt-3">
              Faites signer le client ci-dessous pour valider la clôture.
            </p>

            <div className="relative overflow-hidden rounded-[24px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
              <TechnicianSignaturePad ref={sigRef} />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                data-testid="finish-job-clear-signature"
                onClick={() => sigRef.current?.clear()}
                aria-label="Effacer la signature"
                className="flex min-h-[56px] flex-1 items-center justify-center rounded-[20px] bg-white text-rose-500 shadow-sm ring-1 ring-inset ring-black/5 transition-all hover:bg-rose-50 hover:ring-rose-200 active:scale-[0.98]"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                data-testid="finish-job-back-photos"
                onClick={() => {
                  stopCamera();
                  setStep("photos");
                }}
                aria-label="Retour aux photos"
                className="flex min-h-[56px] flex-1 items-center justify-center rounded-[20px] bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-black/5 transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              data-testid="finish-job-submit"
              onClick={() => void submitAll()}
              aria-label="Envoyer la clôture"
              className="mt-4 flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[24px] bg-emerald-500 px-4 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-600 hover:shadow-[0_12px_28px_-8px_rgba(16,185,129,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="font-semibold tracking-wide text-[16px]">Valider l'intervention</span>
              <SendHorizontal className="h-6 w-6" aria-hidden />
            </button>
          </div>
        ) : null}

        {step === "submitting" ? (
          <div data-testid="finish-job-submitting" className="flex flex-col items-center justify-center gap-6 py-20 animate-in fade-in duration-500">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin" />
              <SendHorizontal className="h-8 w-8 text-emerald-500 animate-pulse" aria-hidden />
            </div>
            <p className="text-[15px] font-medium text-slate-600 tracking-wide">Clôture en cours...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
