"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useTechnicianPushMessaging } from "@/features/notifications/useTechnicianPushMessaging";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

export default function TechnicianPushNotificationPanel() {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const { status, lastError, registerPush } = useTechnicianPushMessaging(vapidKey);

  const hint =
    status === "needs_vapid"
      ? "Clé VAPID manquante (.env)."
      : status === "needs_sign_in"
        ? "Connexion requise."
        : status === "unsupported"
          ? "Navigateur incompatible."
          : status === "blocked"
            ? "Notifications bloquées."
            : status === "registered"
              ? "Actives."
              : status === "registering"
                ? "…"
                : status === "error"
                  ? "Erreur."
                  : "En attente d’activation.";

  return (
    <div data-testid="technician-push-panel" style={outfit} className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-3`}>
      <h2 className="sr-only">Notifications push</h2>
      <p className="sr-only">
        Alertes missions et rappel quotidien 17h Europe/Bruxelles si interventions ouvertes ; Firebase Cloud Messaging et service worker.
      </p>

      <div className="flex flex-col items-center gap-2 rounded-[16px] border border-black/[0.06] bg-white/90 px-3 py-4 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.14)]">
        <span data-testid="technician-push-status" className="sr-only">
          {hint}
        </span>
        <div className="flex justify-center" aria-hidden>
          {status === "registered" ? (
            <Bell className="h-10 w-10 shrink-0 text-emerald-600" />
          ) : status === "blocked" ||
            status === "unsupported" ||
            status === "needs_vapid" ||
            status === "needs_sign_in" ? (
            <BellOff className="h-10 w-10 shrink-0 text-amber-600" />
          ) : status === "registering" ? (
            <Loader2 className="h-10 w-10 shrink-0 animate-spin text-slate-600" />
          ) : (
            <Bell className="h-10 w-10 shrink-0 text-slate-400" />
          )}
        </div>
        {lastError ? (
          <p data-testid="technician-push-error" className="text-center text-[12px] font-medium text-rose-700">
            {lastError}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        data-testid="technician-push-enable-btn"
        disabled={
          status === "unsupported" ||
          status === "blocked" ||
          status === "needs_vapid" ||
          status === "needs_sign_in" ||
          status === "registered" ||
          status === "registering"
        }
        onClick={() => void registerPush()}
        aria-label="Activer les notifications"
        className="flex min-h-[48px] w-full items-center justify-center rounded-[16px] bg-slate-900 px-4 shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <BellRing className="h-6 w-6 text-white" aria-hidden />
        <span className="sr-only">Activer</span>
      </button>
    </div>
  );
}
