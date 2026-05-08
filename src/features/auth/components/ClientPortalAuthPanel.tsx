"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { Building2, LayoutDashboard, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { auth, isConfigured } from "@/core/config/firebase";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { CLIENT_PORTAL_AUTH_SLOT_INDEX, EMAIL_LINK_STORAGE_KEY } from "@/features/auth/clientPortalConstants";
import { syncClientPortalProfile } from "@/features/auth/clientPortalProfile";
import { useTranslation } from "@/core/i18n/I18nContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const LOGO_URL = process.env.NEXT_PUBLIC_CLIENT_PORTAL_LOGO_URL?.trim();

export default function ClientPortalAuthPanel() {
  const pager = useDashboardPagerOptional();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const user = auth?.currentUser ?? null;

  const goDashboard = async () => {
    if (!user || !auth) return;
    await syncClientPortalProfile(user);
    pager?.setPageIndex(CLIENT_PORTAL_AUTH_SLOT_INDEX);
  };

  const sendMagicLink = async () => {
    if (!auth || !email.trim()) {
      toast.error(t('auth.email_required'));
      return;
    }
    setSending(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: `${origin}/`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim());
      toast.success(t('auth.link_sent'), { description: t('auth.check_inbox') });
    } catch (e) {
      console.error(e);
      toast.error(t('auth.send_failed'));
    } finally {
      setSending(false);
    }
  };

  const signInGoogle = () => {
    if (!auth) return;
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    void signInWithRedirect(auth, p);
  };

  const signInMicrosoft = () => {
    if (!auth) return;
    const p = new OAuthProvider("microsoft.com");
    p.addScope("email");
    p.addScope("profile");
    p.setCustomParameters({ prompt: "select_account" });
    void signInWithRedirect(auth, p);
  };

  if (!isConfigured || !auth) {
    return (
      <div
        data-testid="client-portal-offline"
        style={outfit}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-10 opacity-70"
      >
        <Building2 className="h-12 w-12 text-slate-300" aria-hidden />
        <span className="sr-only">{t('auth.firebase_not_configured')}</span>
      </div>
    );
  }

  if (user) {
    return (
      <div
        data-testid="client-portal-authed"
        style={outfit}
        className="flex min-h-0 flex-1 flex-col justify-center gap-4 pb-1"
      >
        <div className="flex flex-col items-center gap-4 rounded-[22px] border border-black/[0.06] bg-gradient-to-b from-white/95 to-white/82 px-5 py-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          {LOGO_URL ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL publique optionnelle hors bundle
            <img src={LOGO_URL} alt="" className="h-14 w-auto max-w-[200px] object-contain" />
          ) : (
            <Building2 className="h-11 w-11 text-slate-400" aria-hidden />
          )}
          <span className="sr-only">{t('auth.session')} {user.email ?? user.uid}</span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              data-testid="client-portal-dashboard"
              onClick={() => void goDashboard()}
              className="inline-flex items-center gap-2 rounded-[14px] bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(15,23,42,0.35)]"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              {t('auth.dashboard')}
            </button>
            <button
              type="button"
              data-testid="client-portal-signout"
              onClick={() => {
                if (auth) void signOut(auth);
              }}
              className="inline-flex items-center gap-2 rounded-[14px] border border-black/[0.08] bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              {t('auth.signout')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="client-portal-auth" style={outfit} className="flex min-h-0 flex-1 flex-col gap-4 pb-1">
      <div className="flex flex-col items-center gap-5 rounded-[22px] border border-black/[0.06] bg-gradient-to-b from-white/96 via-white/90 to-slate-50/85 px-5 py-9 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        {LOGO_URL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={LOGO_URL} alt="" className="h-16 w-auto max-w-[220px] object-contain drop-shadow-sm" />
        ) : (
          <Building2 className="h-14 w-14 text-slate-400" aria-hidden />
        )}

        <div className="flex w-full max-w-sm gap-2">
          <label htmlFor="client-portal-email-input" className="sr-only">
            {t('auth.email_label')}
          </label>
          <input
            id="client-portal-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email_placeholder')}
            data-testid="client-portal-email"
            autoComplete="email"
            className="min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-white/98 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
          />
          <button
            type="button"
            data-testid="client-portal-magic-send"
            disabled={sending}
            onClick={() => void sendMagicLink()}
            className="inline-flex shrink-0 items-center justify-center rounded-[14px] bg-slate-900 px-3 py-2.5 text-white disabled:opacity-45"
            aria-label={t('auth.receive_link_label')}
          >
            <Mail className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-2.5">
          <button
            type="button"
            data-testid="client-portal-google"
            onClick={signInGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-black/[0.07] bg-white py-3 text-sm font-bold text-slate-900 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.15)]"
          >
            <span className="text-[17px] font-black text-blue-600" aria-hidden>
              G
            </span>
            Google
          </button>
          <button
            type="button"
            data-testid="client-portal-microsoft"
            onClick={signInMicrosoft}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-black/[0.07] bg-white py-3 text-sm font-bold text-slate-900 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.15)]"
          >
            <span className="text-[17px] font-black text-sky-600" aria-hidden>
              M
            </span>
            Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}
