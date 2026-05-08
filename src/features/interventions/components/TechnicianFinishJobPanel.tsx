"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, ClipboardList, FileSignature, Loader2, SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { auth, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useOfflineSyncOptional } from "@/context/OfflineSyncContext";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { capturePhotoFromVideo } from "@/features/interventions/finishJobCapture";
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

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

type WizardStep = "photos" | "signature" | "submitting" | "success";

export default function TechnicianFinishJobPanel() {
  const pager = useDashboardPagerOptional();
  const workspace = useCompanyWorkspaceOptional();
  const { finishJobInterventionId, setFinishJobInterventionId } = useTechnicianFinishJob();
  const offlineSync = useOfflineSyncOptional();

  const [step, setStep] = useState<WizardStep>("photos");
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sigRef = useRef<TechnicianSignaturePadHandle>(null);

  const [invoiceChecklistOptimistic, setInvoiceChecklistOptimistic] = useState(false);

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
    if (!interventionId || !auth?.currentUser) {
      toast.error("Connexion requise");
      return;
    }
    const sig = sigRef.current?.getPngDataUrl();
    if (!sig) {
      toast.error("Signature manquante");
      return;
    }
    setStep("submitting");
    try {
      const result = await finalizeCompletionOfflineAware({
        interventionId,
        photoDataUrls: photos,
        signaturePngDataUrl: sig,
      });

      if (result.outcome === "error") {
        setStep("signature");
        toast.error("Envoi impossible", { description: result.message });
        return;
      }

      stopCamera();
      setStep("success");
      setInvoiceChecklistOptimistic(true);

      if (result.outcome === "queued") {
        toast.success("Enregistré hors ligne", {
          description: "Synchronisation automatique au retour du réseau.",
        });
      } else {
        toast.success("Intervention terminée");
      }

      void offlineSync?.refreshPendingCount();
    } catch (e) {
      console.error(e);
      setStep("signature");
      toast.error("Envoi impossible", {
        description: e instanceof Error ? e.message : String(e),
      });
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
    <div data-testid="finish-job-panel" style={outfit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-4`}>
        <div className="rounded-[16px] bg-slate-900 px-3 py-2 text-center">
          <p className="sr-only">Identifiant dossier</p>
          <p className="truncate font-mono text-[13px] font-bold text-white">{interventionId}</p>
        </div>

        {step === "photos" ? (
          <>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-slate-700" aria-hidden />
              <h2 className="sr-only">Photos chantier</h2>
            </div>
            <p className="sr-only">
              Entre {FINISH_JOB_MIN_PHOTOS} et {FINISH_JOB_MAX_PHOTOS} photos ; cadrez puis capturez.
            </p>

            <div className="relative overflow-hidden rounded-[20px] bg-black shadow-inner">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="aspect-[4/3] w-full object-cover"
                muted
                playsInline
                autoPlay
                aria-label="Caméra travaux terminés"
              />
            </div>

            <button
              type="button"
              data-testid="finish-job-capture-btn"
              disabled={photos.length >= FINISH_JOB_MAX_PHOTOS}
              onClick={captureShot}
              aria-label="Capturer une photo"
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <Camera className="h-6 w-6" aria-hidden />
            </button>

            <div data-testid="finish-job-photo-strip" className="flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <div key={`${i}-${src.slice(0, 24)}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-black/[0.08] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    data-testid={`finish-job-photo-remove-${i}`}
                    aria-label="Supprimer la photo"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
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
              className="flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-slate-900 px-4 text-white shadow-lg transition disabled:opacity-35"
            >
              <ArrowRight className="h-6 w-6" aria-hidden />
            </button>
          </>
        ) : null}

        {step === "signature" ? (
          <>
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-slate-700" aria-hidden />
              <h2 className="sr-only">Signature client</h2>
            </div>

            <TechnicianSignaturePad ref={sigRef} />

            <div className="flex gap-2">
              <button
                type="button"
                data-testid="finish-job-clear-signature"
                onClick={() => sigRef.current?.clear()}
                aria-label="Effacer la signature"
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-[16px] border border-black/[0.1] bg-white text-slate-800"
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
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-[16px] border border-black/[0.1] bg-white text-slate-700"
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              data-testid="finish-job-submit"
              onClick={() => void submitAll()}
              aria-label="Envoyer la clôture"
              className="flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-emerald-600 px-4 text-white shadow-[0_14px_36px_-12px_rgba(5,150,105,0.55)] transition hover:bg-emerald-700"
            >
              <SendHorizontal className="h-6 w-6" aria-hidden />
            </button>
          </>
        ) : null}

        {step === "submitting" ? (
          <div data-testid="finish-job-submitting" className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600" aria-hidden />
            <p className="sr-only">Envoi en cours</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
