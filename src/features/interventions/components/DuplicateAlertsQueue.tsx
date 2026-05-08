"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, GitMerge, Lock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DuplicateAlertRow } from "@/features/interventions/duplicateAlertTypes";
import { ignoreDuplicateAlert, mergeDuplicateAlert } from "@/features/interventions/duplicateAlertActions";
import { formatDuplicateRelativeCreated } from "@/features/interventions/duplicateDetectionCore";

function relativeSnippet(alert: DuplicateAlertRow): string {
  const ms = Date.parse(alert.similarCreatedAt);
  if (Number.isNaN(ms)) return "récemment";
  return formatDuplicateRelativeCreated(ms);
}

function duplicateHeadlineFull(alert: DuplicateAlertRow, rel: string): string {
  return `#${alert.newInterventionId} · même adresse que #${alert.similarInterventionId} (${rel})`;
}

export type DuplicateAlertsQueueProps = {
  openAlerts: DuplicateAlertRow[];
  /** Actions réservées aux admins société (Firestore rules). */
  isAdmin: boolean;
  variant?: "compact" | "full";
};

export default function DuplicateAlertsQueue({ openAlerts, isAdmin, variant = "compact" }: DuplicateAlertsQueueProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...openAlerts].sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
  }, [openAlerts]);

  const runMerge = useCallback(
    async (alert: DuplicateAlertRow) => {
      if (!firestore || !isConfigured) return;
      const uid = auth?.currentUser?.uid;
      if (!uid) {
        toast.error("Connexion requise");
        return;
      }
      const ok = window.confirm(
        "Fusionner ? La nouvelle demande sera supprimée et le dossier existant sera conservé.",
      );
      if (!ok) return;
      setBusyId(alert.id);
      try {
        await mergeDuplicateAlert(firestore, alert.id, alert.newInterventionId, uid);
        toast.success("Doublon fusionné — nouvelle demande supprimée.");
      } catch (e) {
        console.error(e);
        toast.error("Fusion impossible (droits ou réseau).");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const runIgnore = useCallback(
    async (alert: DuplicateAlertRow) => {
      if (!firestore || !isConfigured) return;
      const uid = auth?.currentUser?.uid;
      if (!uid) {
        toast.error("Connexion requise");
        return;
      }
      setBusyId(alert.id);
      try {
        await ignoreDuplicateAlert(firestore, alert.id, uid);
        toast.message("Alerte ignorée.");
      } catch (e) {
        console.error(e);
        toast.error("Action impossible (droits admin requis).");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  if (!sorted.length) return null;

  return (
    <div
      className={cn("flex flex-col gap-2", variant === "full" ? "gap-3" : "")}
      data-testid="duplicate-alerts-queue"
      aria-live="polite"
    >
      {sorted.map((alert) => {
        const rel = relativeSnippet(alert);
        const compactMsg = `Demande similaire : dossier #${alert.similarInterventionId} — même adresse, ${rel}`;
        const headlineFull = duplicateHeadlineFull(alert, rel);
        const loading = busyId === alert.id;
        const controlsIconOnly = variant === "full";
        return (
          <div
            key={alert.id}
            data-testid={`duplicate-alert-banner-${alert.id}`}
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50/95 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
              variant === "full"
                ? "border-amber-200/75 bg-white/92 px-3 py-3 sm:items-start"
                : "",
            )}
          >
            <div className="flex min-w-0 flex-1 gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <div className="min-w-0">
                {variant === "full" ? (
                  <>
                    <p className="text-[14px] font-bold leading-snug tracking-tight text-amber-950">{headlineFull}</p>
                    <p className="sr-only">Alerte doublon probable dans les 48 heures.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-amber-950">Possible doublon (48h)</p>
                    <p className="mt-1 text-[13px] font-medium leading-snug text-amber-950/90">{compactMsg}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-amber-900/70">
                      Nouveau #{alert.newInterventionId} · similaire #{alert.similarInterventionId}
                    </p>
                  </>
                )}
              </div>
            </div>
            {isAdmin ? (
              <div className={cn("flex shrink-0 flex-wrap gap-2", variant === "full" ? "sm:pt-0.5" : "")}>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={loading}
                  data-testid={`duplicate-alert-merge-${alert.id}`}
                  className={cn(
                    controlsIconOnly
                      ? "h-11 w-11 min-w-[44px] rounded-[14px] bg-slate-900 p-0 shadow-sm"
                      : "gap-1 bg-slate-900",
                  )}
                  onClick={() => void runMerge(alert)}
                  aria-label="Fusionner : garder l’ancien dossier et supprimer le doublon"
                  title="Fusionner"
                >
                  <GitMerge className="h-4 w-4" aria-hidden />
                  {controlsIconOnly ? <span className="sr-only">Fusionner</span> : "Fusionner"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  data-testid={`duplicate-alert-ignore-${alert.id}`}
                  className={cn(
                    controlsIconOnly
                      ? "h-11 w-11 min-w-[44px] rounded-[14px] border-black/[0.08] p-0 shadow-sm"
                      : "gap-1",
                  )}
                  onClick={() => void runIgnore(alert)}
                  aria-label="Ignorer cette alerte"
                  title="Ignorer"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {controlsIconOnly ? <span className="sr-only">Ignorer</span> : "Ignorer"}
                </Button>
              </div>
            ) : (
              <div
                data-testid="duplicate-alert-read-only"
                className={cn(
                  "flex items-center gap-2 text-amber-900/85",
                  variant === "full" ? "rounded-[14px] border border-black/[0.06] bg-white/85 px-2.5 py-2" : "",
                )}
                title="Réservé aux administrateurs"
              >
                <Lock className="h-4 w-4 shrink-0 text-amber-800/80" aria-hidden />
                <span className="sr-only">Lecture seule — actions réservées aux administrateurs société.</span>
                {variant === "compact" ? (
                  <span className="text-[12px] font-semibold leading-tight">Admin uniquement : fusion ou ignorer.</span>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
