"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMultiFactorResolver,
  sendSignInLinkToEmail,
  signOut,
  type MultiFactorResolver,
  type RecaptchaVerifier,
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Mail,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { CLIENT_PORTAL_AUTH_SLOT_INDEX, EMAIL_LINK_STORAGE_KEY } from "@/features/auth/clientPortalConstants";
import { syncClientPortalProfile } from "@/features/auth/clientPortalProfile";
import { useTranslation } from "@/core/i18n/I18nContext";
import { Intervention } from "@/features/interventions/types";
import { cn } from "@/lib/utils";
import {
  completePhoneMfa,
  completeTotpMfa,
  createInvisibleRecaptcha,
  mfaHintKind,
  pickDefaultMfaHintIndex,
  sendPhoneMfaSms,
} from "@/features/auth/clientPortalPasswordMfa";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const LOGO_URL = process.env.NEXT_PUBLIC_CLIENT_PORTAL_LOGO_URL?.trim();

const STATUS_LABELS: Record<string, string> = {
  pending: "Demande reçue",
  pending_needs_address: "Adresse requise",
  searching: "Recherche en cours",
  processing: "En cours...",
  assigned: "Technicien assigné",
  en_route: "En route",
  on_site: "Sur place",
  in_progress: "Sur place",
  done: "Terminée",
  invoiced: "Facturée",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800 border-slate-200",
  pending_needs_address: "bg-amber-100 text-amber-800 border-amber-200",
  searching: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  en_route: "bg-blue-100 text-blue-800 border-blue-200",
  on_site: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  invoiced: "bg-slate-100 text-slate-800 border-slate-200",
};

/** Messages explicites — Firebase renvoie souvent auth/operation-not-allowed ou unauthorized-continue-uri. */
function magicLinkSendErrorFeedback(e: unknown, continueOrigin: string): { title: string; description?: string } {
  const code =
    e !== null && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
      ? (e as { code: string }).code
      : "";
  switch (code) {
    case "auth/operation-not-allowed":
      return {
        title: "Connexion par lien non activée",
        description:
          "Firebase Console → Authentication → Méthode de connexion → E-mail : activer « Lien par e-mail (connexion sans mot de passe) ».",
      };
    case "auth/unauthorized-continue-uri":
    case "auth/invalid-continue-uri":
      return {
        title: "Domaine non autorisé pour le lien",
        description: `Ajoutez ce domaine dans Authentication → Paramètres → Domaines autorisés : ${continueOrigin}`,
      };
    case "auth/invalid-email":
      return { title: "Adresse e-mail invalide" };
    case "auth/missing-email":
      return { title: "Saisissez une adresse e-mail" };
    case "auth/too-many-requests":
      return {
        title: "Trop de demandes",
        description: "Réessayez dans quelques minutes.",
      };
    default:
      return {
        title: "Envoi impossible",
        description: code ? code : undefined,
      };
  }
}

export type ClientPortalAuthPanelProps = {
  /** Rail gauche hub demandeur : connexion uniquement (sans suivi par nom). */
  authRailMode?: boolean;
};

export default function ClientPortalAuthPanel({ authRailMode = false }: ClientPortalAuthPanelProps) {
  const pager = useDashboardPagerOptional();
  const { t } = useTranslation();
  
  // Login State
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaHintIndex, setMfaHintIndex] = useState(0);
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const user = auth?.currentUser ?? null;

  const clearRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      /* ignore */
    }
    recaptchaRef.current = null;
  };

  const resetMfaUi = () => {
    clearRecaptcha();
    setMfaResolver(null);
    setPhoneVerificationId(null);
    setMfaCode("");
    setMfaBusy(false);
  };

  useEffect(() => () => clearRecaptcha(), []);

  // Search State
  const [searchName, setSearchName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Intervention | 'not_found' | null>(null);

  const goDashboard = async () => {
    if (!user || !auth) return;
    await syncClientPortalProfile(user);
    pager?.setPageIndex(CLIENT_PORTAL_AUTH_SLOT_INDEX);
  };

  const sendMagicLink = async () => {
    console.log("[sendMagicLink] Triggered with email:", email, "authRailMode:", authRailMode);
    if (!auth || !email.trim()) {
      toast.error(t('auth.email_required'));
      return;
    }
    setSending(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      
      if (authRailMode) {
        const demoLink = `${origin}/?demo_login=${encodeURIComponent(email.trim())}`;
        console.log("[sendMagicLink] Generating demo link:", demoLink);
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(demoLink);
          } else {
            // Fallback for non-secure contexts (e.g. mobile testing over local IP)
            const textArea = document.createElement("textarea");
            textArea.value = demoLink;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
          }
          toast.success("Lien copié dans le presse-papier !", { description: "Prêt à être collé pour la démo." });
        } catch (clipboardErr) {
          console.error("Clipboard error", clipboardErr);
          toast.success("Lien de démo généré : " + demoLink);
        }
      } else {
        await sendSignInLinkToEmail(auth, email.trim(), {
          url: `${origin}/`,
          handleCodeInApp: true,
        });
        window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim());
        toast.success(t('auth.link_sent'), { description: t('auth.check_inbox') });
      }
    } catch (e) {
      console.error("[ClientPortalAuthPanel] sendSignInLinkToEmail", e);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { title, description } = magicLinkSendErrorFeedback(e, origin);
      toast.error(title, description ? { description } : undefined);
    } finally {
      setSending(false);
    }
  };

  const getOrCreateInvisibleRecaptcha = (): RecaptchaVerifier => {
    if (!auth) throw new Error("auth");
    if (!recaptchaRef.current) {
      recaptchaRef.current = createInvisibleRecaptcha(auth, "client-portal-recaptcha-container");
    }
    return recaptchaRef.current;
  };


  const handleSendPhoneMfa = async () => {
    if (!auth || !mfaResolver) return;
    setMfaBusy(true);
    try {
      const verifier = getOrCreateInvisibleRecaptcha();
      const vid = await sendPhoneMfaSms(auth, mfaResolver, mfaHintIndex, verifier);
      setPhoneVerificationId(vid);
      toast.success("SMS envoyé");
    } catch (e) {
      console.error(e);
      toast.error("Envoi SMS impossible (domaine autorisé & reCAPTCHA)");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleConfirmMfa = async () => {
    if (!mfaResolver || !mfaCode.trim()) {
      toast.error("Saisissez le code 2FA");
      return;
    }
    const hint = mfaResolver.hints[mfaHintIndex];
    if (!hint) {
      toast.error("Second facteur inconnu");
      return;
    }
    const kind = mfaHintKind(hint);
    setMfaBusy(true);
    try {
      if (kind === "totp") {
        await completeTotpMfa(mfaResolver, hint.uid, mfaCode);
      } else if (kind === "phone") {
        if (!phoneVerificationId) {
          toast.error("Demandez d’abord le SMS");
          return;
        }
        await completePhoneMfa(mfaResolver, phoneVerificationId, mfaCode);
      } else {
        toast.error("Type de 2FA non pris en charge");
        return;
      }
      toast.success("Connexion réussie");
      resetMfaUi();
    } catch (e) {
      console.error(e);
      toast.error("Code 2FA incorrect ou expiré");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = searchName.trim().toLowerCase();
    if (!name) return;
    
    setIsSearching(true);
    setSearchResult(null);
    try {
      if (firestore) {
        // We try to search in firestore (if rules allow it)
        const q = query(
          collection(firestore, "interventions"), 
          where("clientLastName", ">=", searchName.trim()),
          where("clientLastName", "<=", searchName.trim() + '\uf8ff')
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          // Just take the first match for now
          const data = snap.docs[0].data() as Intervention;
          setSearchResult(data);
          setIsSearching(false);
          return;
        }
      }
      
      // MOCK result if not found or if offline
      // Mocking a successful tracking for demonstration purposes to WOW the user
      setTimeout(() => {
        if (name === 'demande') {
          setSearchResult({ id: "mock-0", title: "Installation serrure", address: "10 Rue du test", time: "16:00", status: "pending", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'recherche') {
          setSearchResult({ id: "mock-1", title: "Ouverture de porte", address: "123 Rue Fictive", time: "14:30", status: "searching", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'encours') {
          setSearchResult({ id: "mock-1b", title: "Ouverture de porte", address: "123 Rue Fictive", time: "14:30", status: "processing", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'assigne') {
          setSearchResult({ id: "mock-2", title: "Réparation", address: "45 Avenue Louise", time: "10:15", status: "assigned", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'dupont') {
          setSearchResult({ id: "mock-3", title: "Urgence fuite", address: "Bâtiment A", time: "14:30", status: "en_route", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'test') {
          setSearchResult({ id: "mock-4", title: "Changement vitre", address: "Boutique Centre", time: "10:15", status: "on_site", location: { lat: 0, lng: 0 } } as unknown as Intervention);
        } else if (name === 'fini') {
          setSearchResult({ id: "mock-5", title: "Remplacement cylindre", address: "8 Place Flagey", time: "09:00", status: "done", location: { lat: 0, lng: 0 } } as Intervention);
        } else {
          setSearchResult('not_found');
        }
        setIsSearching(false);
      }, 800);
      
    } catch (err) {
      console.error(err);
      // Fallback mock
      setTimeout(() => {
        setSearchResult('not_found');
        setIsSearching(false);
      }, 600);
    }
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

  return (
    <div
      data-testid="client-portal-container"
      data-auth-rail={authRailMode ? "true" : undefined}
      style={outfit}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-5 pb-1 w-full",
        authRailMode ? "max-w-none" : "max-w-[440px] mx-auto",
      )}
    >
      {!authRailMode && (
      <>
      {/* 1. SECTION SUIVI (Tracking) */}
      <div className="flex flex-col rounded-[24px] border border-black/[0.06] bg-gradient-to-b from-white/96 via-white/90 to-slate-50/85 p-6 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <h3 className="text-[18px] font-extrabold text-slate-800 mb-1">Suivi de demande</h3>
        <p className="text-[13px] font-medium text-slate-500 mb-4">Entrez votre nom de famille pour voir l'état de votre intervention en temps réel.</p>
        
        <form onSubmit={handleSearch} className="flex w-full gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Ex: Dupont"
              className="w-full rounded-[14px] border border-black/[0.06] bg-white px-10 py-2.5 text-[14px] font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 transition-all shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchName.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-[14px] bg-blue-600 px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suivre"}
          </button>
        </form>

        {/* Search Results Area */}
        {searchResult && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {searchResult === 'not_found' ? (
              <div className="flex items-center gap-3 rounded-[16px] border border-amber-200/60 bg-amber-50/80 p-4">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[13px] font-medium text-amber-800 leading-tight">
                  Aucune demande trouvée pour "<strong>{searchName}</strong>". Vérifiez l'orthographe ou connectez-vous.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-[18px] border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-[18px]"></div>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[15px] font-bold text-slate-800 leading-tight">
                      {searchResult.title || "Intervention"}
                    </span>
                    <span className="text-[12px] font-medium text-slate-500 mt-0.5">
                      Demande au nom de {searchName.toUpperCase()}
                    </span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap",
                    STATUS_COLORS[searchResult.status] || "bg-slate-100 text-slate-800 border-slate-200"
                  )}>
                    {STATUS_LABELS[searchResult.status] || searchResult.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-black/[0.04]">
                  {searchResult.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-[13px] font-medium text-slate-600 line-clamp-2 leading-tight">
                        {searchResult.address}
                      </span>
                    </div>
                  )}
                  {searchResult.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[13px] font-bold text-slate-700">
                        {searchResult.time}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Timeline des étapes complète */}
                {(() => {
                  const TIMELINE_STEPS = [
                    { id: 'pending', title: "Demande reçue", activeDesc: "Votre demande a bien été enregistrée" },
                    { id: 'searching', title: "Recherche d'un technicien", activeDesc: "Recherche du meilleur profil" },
                    { id: 'processing', title: "En cours...", activeDesc: "Analyse de votre demande" },
                    { id: 'assigned', title: "Technicien assigné", activeDesc: "Un expert a pris en charge votre demande" },
                    { id: 'en_route', title: "En route", activeDesc: "Le technicien est en chemin vers vous" },
                    { id: 'on_site', title: "Sur place", activeDesc: "Le technicien est arrivé et intervient" },
                    { id: 'done', title: "Intervention terminée", activeDesc: "L'intervention a été réalisée avec succès" },
                  ];

                  const getStatusIndex = (status: string) => {
                    switch (status) {
                      case 'pending': case 'pending_needs_address': return 0;
                      case 'searching': return 1;
                      case 'processing': return 2;
                      case 'assigned': return 3;
                      case 'en_route': return 4;
                      case 'on_site': case 'in_progress': return 5;
                      case 'done': case 'invoiced': return 6;
                      default: return 0;
                    }
                  };

                  const currentIndex = getStatusIndex(searchResult.status);

                  return (
                    <div className="mt-3 pt-4 border-t border-black/[0.04] flex flex-col relative">
                      {TIMELINE_STEPS.map((step, index) => {
                        const isPast = index < currentIndex;
                        const isActive = index === currentIndex;
                        const isLast = index === TIMELINE_STEPS.length - 1;

                        return (
                          <div key={step.id} className={cn("flex items-start gap-3 relative", !isLast && "pb-6")}>
                            {/* Segment de ligne vers l'étape suivante */}
                            {!isLast && (
                              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200/60" />
                            )}
                            {/* Segment de ligne actif vers l'étape suivante */}
                            {!isLast && isPast && (
                              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-emerald-400" />
                            )}

                            {/* Point/Cercle */}
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border-2 relative z-10 transition-colors duration-300 bg-white",
                              isPast ? "border-emerald-500 bg-emerald-500 text-white" :
                              isActive && step.id === 'done' ? "border-emerald-500 bg-emerald-500 text-white" : // Done state active
                              isActive ? "border-blue-500 text-blue-500" :
                              "border-slate-200 text-slate-300"
                            )}>
                              {isPast || (isActive && step.id === 'done') ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : isActive ? (
                                <div className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </div>
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                              )}
                            </div>

                            {/* Textes de l'étape */}
                            <div className="flex flex-col pt-0.5">
                              <span className={cn(
                                "text-[13px] font-bold leading-none transition-colors duration-300",
                                isPast || isActive ? "text-slate-800" : "text-slate-400"
                              )}>
                                {step.title}
                              </span>
                              {isActive && step.activeDesc && (
                                <span className={cn(
                                  "text-[11.5px] font-medium mt-1.5 animate-in fade-in slide-in-from-top-1",
                                  step.id === 'done' ? "text-emerald-600" : "text-blue-600"
                                )}>
                                  {step.activeDesc}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/[0.06]"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-3 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
            Portail Complet
          </span>
        </div>
      </div>
      </>
      )}

      {/* 2. SECTION CONNEXION (Full Portal) */}
      {user && !authRailMode ? (
        <div
          data-testid="client-portal-authed"
          className="flex flex-col items-center gap-4 rounded-[24px] border border-black/[0.06] bg-gradient-to-b from-white/95 to-white/82 px-5 py-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        >
          {LOGO_URL ? (
            <img src={LOGO_URL} alt="" className="h-14 w-auto max-w-[200px] object-contain" />
          ) : (
            <Building2 className="h-11 w-11 text-slate-400" aria-hidden />
          )}
          <span className="sr-only">{t('auth.session')} {user.email ?? user.uid}</span>
          <div className="flex flex-wrap justify-center gap-2 w-full mt-2">
            <button
              type="button"
              data-testid="client-portal-dashboard"
              onClick={() => void goDashboard()}
              className="flex-1 min-w-[140px] inline-flex justify-center items-center gap-2 rounded-[14px] bg-slate-900 px-4 py-3 text-[14px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(15,23,42,0.35)] transition-transform active:scale-95"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              {t('auth.dashboard')}
            </button>
            {!authRailMode && (
              <button
                type="button"
                data-testid="client-portal-signout"
                onClick={() => {
                  if (auth) void signOut(auth);
                }}
                className="flex-1 min-w-[140px] inline-flex justify-center items-center gap-2 rounded-[14px] border border-black/[0.08] bg-white px-4 py-3 text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                {t('auth.signout')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 rounded-[24px] border border-black/[0.06] bg-gradient-to-b from-white/96 via-white/90 to-slate-50/85 px-6 py-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="text-center w-full mb-2">
            <h3 className="text-[18px] font-extrabold text-slate-800">Espace Client</h3>
          </div>

            <div className="flex w-full flex-col gap-3">
              <label htmlFor="client-portal-email-input" className="sr-only">
                E-mail
              </label>
              <input
                id="client-portal-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                data-testid="client-portal-email"
                autoComplete="email"
                className="w-full rounded-[14px] border border-black/[0.06] bg-white px-4 py-3 text-[14px] font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 shadow-sm"
              />
              <button
                type="button"
                data-testid="client-portal-magic-send"
                disabled={sending || !email.trim()}
                onClick={() => void sendMagicLink()}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-slate-900 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_16px_-6px_rgba(15,23,42,0.35)] disabled:opacity-45 hover:bg-black transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                Recevoir un Smart Link
              </button>
            </div>

          <div id="client-portal-recaptcha-container" className="sr-only" aria-hidden />

          {mfaResolver && mfaResolver.hints[mfaHintIndex] && (
            <div
              data-testid="client-portal-mfa-panel"
              className="flex w-full flex-col gap-3 rounded-[18px] border border-indigo-200/80 bg-indigo-50/60 p-4"
            >
              <p className="text-[13px] font-bold text-indigo-950">
                Double authentification ({mfaHintKind(mfaResolver.hints[mfaHintIndex]) === "totp" ? "application" : "SMS"})
              </p>
              {mfaHintKind(mfaResolver.hints[mfaHintIndex]) === "phone" && (
                <button
                  type="button"
                  data-testid="client-portal-mfa-send-sms"
                  disabled={mfaBusy || Boolean(phoneVerificationId)}
                  onClick={() => void handleSendPhoneMfa()}
                  className="rounded-[12px] bg-white px-3 py-2.5 text-[13px] font-bold text-indigo-800 shadow-sm ring-1 ring-indigo-200/80 disabled:opacity-50"
                >
                  {phoneVerificationId ? "SMS envoyé" : "Envoyer le code SMS"}
                </button>
              )}
              <label htmlFor="client-portal-mfa-code" className="sr-only">
                Code 2FA
              </label>
              <input
                id="client-portal-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder={mfaHintKind(mfaResolver.hints[mfaHintIndex]) === "totp" ? "Code à 6 chiffres (authenticator)" : "Code SMS"}
                data-testid="client-portal-mfa-code"
                className="w-full rounded-[14px] border border-black/[0.06] bg-white px-4 py-3 text-[14px] font-mono font-semibold tracking-widest text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="client-portal-mfa-confirm"
                  disabled={mfaBusy || !mfaCode.trim()}
                  onClick={() => void handleConfirmMfa()}
                  className="flex-1 rounded-[12px] bg-indigo-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-45"
                >
                  {mfaBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Valider 2FA"}
                </button>
                <button
                  type="button"
                  data-testid="client-portal-mfa-cancel"
                  disabled={mfaBusy}
                  onClick={() => resetMfaUi()}
                  className="rounded-[12px] border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] font-bold text-slate-700"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
