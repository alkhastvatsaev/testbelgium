"use client";

import { useEffect, useState } from "react";
import { useRequesterHub } from "@/features/interventions/context/RequesterHubContext";
import { Check, Clock, MapPin, User, Navigation, CheckCircle2, FileText, Search, X, ArrowRight } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, or, orderBy, limit } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";
import { capitalizeName } from "@/utils/stringUtils";

const springTransition = { type: "spring", bounce: 0, duration: 0.5 } as const;

type TrackedIntervention = {
  id: string;
  status?: string;
  title?: string;
  problem?: string;
  address?: string;
  createdAt?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientCompanyName?: string;
  clientPhone?: string;
};

function useMyLatestIntervention(searchLastName: string, profileLastName: string) {
  const [intervention, setIntervention] = useState<TrackedIntervention | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth || !firestore) {
      setLoading(false);
      return;
    }

    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = undefined;
      }

      const db = firestore;
      if (!db) return;
      let q;

      if (!user) {
        setIntervention(null);
        setLoading(false);
        return;
      }

      q = query(
        collection(db, "interventions"), 
        where("createdByUid", "==", user.uid)
      );

      unsubSnap = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setIntervention(null);
        } else {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackedIntervention);
          const activeSearch = searchLastName.trim().length > 0 ? searchLastName.trim() : profileLastName.trim();
          let matchedDocs = docs;
          if (activeSearch.length > 0) {
            const searchLower = activeSearch.toLowerCase();
            matchedDocs = docs.filter(doc => {
              const last = (doc.clientLastName || "").toLowerCase();
              const first = (doc.clientFirstName || "").toLowerCase();
              const company = (doc.clientCompanyName || "").toLowerCase();
              return last.includes(searchLower) || first.includes(searchLower) || company.includes(searchLower);
            });
          }
          matchedDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setIntervention(matchedDocs[0] || null);
        }
        setLoading(false);
      });
    });

    return () => {
      if (unsubSnap) unsubSnap();
      unsubAuth();
    };
  }, [searchLastName]);

  return { intervention, loading };
}

export default function RequesterTrackingPanel() {
  const { isSubmitting, requestData, lastSubmittedRequest, profile, setProfile, resetRequestOnly } = useRequesterHub();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [syncOnNextLoad, setSyncOnNextLoad] = useState(false);
  
  const { intervention: latestIntervention, loading: interventionLoading } = useMyLatestIntervention(searchQuery, profile.lastName);
  const [user, setUser] = useState(auth?.currentUser ?? null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim().length === 0) return;
    setSearchQuery(searchInput);
    setSyncOnNextLoad(true);
  };

  useEffect(() => {
    if (syncOnNextLoad && !interventionLoading) {
      if (latestIntervention) {
        setProfile((prev) => ({
          ...prev,
          type: "particulier",
          firstName: latestIntervention.clientFirstName || prev.firstName,
          lastName: latestIntervention.clientLastName || prev.lastName,
          companyName: latestIntervention.clientCompanyName || prev.companyName,
          phone: latestIntervention.clientPhone || prev.phone,
        }));
        resetRequestOnly();
        import("sonner").then(({ toast }) => {
          const who = latestIntervention.clientLastName || String(t("requester.tracking.client_fallback"));
          toast.success(`${String(t("requester.tracking.switched_to_case_prefix"))} ${who}`);
        });
      }
      setSyncOnNextLoad(false);
    }
  }, [syncOnNextLoad, interventionLoading, latestIntervention, setProfile, resetRequestOnly]);

  const draftTitle = requestData.problemLabel.trim() || requestData.description.trim();
  const hasDraft = Boolean(draftTitle || requestData.interventionAddress.trim());
  const hasSubmitted = Boolean(latestIntervention || lastSubmittedRequest);
  
  const isSearching = searchQuery.trim().length > 0;
  const hasActiveUI = isSearching ? Boolean(latestIntervention) : (hasDraft || isSubmitting || hasSubmitted);

  const status = latestIntervention?.status || (latestIntervention || lastSubmittedRequest ? "pending" : "draft");
  const step0Done = Boolean(latestIntervention || lastSubmittedRequest);
  const step1Done = step0Done;
  const step2Done = step1Done && !["pending", "pending_needs_address"].includes(status);
  const step3Done = step1Done && ["assigned", "en_route", "on_site", "in_progress", "done", "invoiced"].includes(status);
  const step4Done = step1Done && ["en_route", "on_site", "in_progress", "done", "invoiced"].includes(status);
  const step5Done = step1Done && ["on_site", "in_progress", "done", "invoiced"].includes(status);
  const step6Done = step1Done && ["done", "invoiced"].includes(status);

  const steps = [
    {
      id: "step0",
      title: String(t("tracking.step0")),
      icon: step0Done ? Check : FileText,
      done: step0Done,
      active: !step0Done && (isSubmitting || hasDraft)
    },
    {
      id: "step1",
      title: String(t("tracking.step1")),
      icon: step1Done ? Check : Clock,
      done: step1Done,
      active: step0Done && !step1Done
    },
    {
      id: "step2",
      title: String(t("tracking.step2")),
      icon: step2Done ? Check : Clock,
      done: step2Done,
      active: step1Done && !step2Done
    },
    {
      id: "step3",
      title: String(t("tracking.step3")),
      icon: step3Done ? Check : User,
      done: step3Done,
      active: step2Done && !step3Done
    },
    {
      id: "step4",
      title: String(t("tracking.step4")),
      icon: step4Done ? Check : Navigation,
      done: step4Done,
      active: step3Done && !step4Done
    },
    {
      id: "step5",
      title: String(t("tracking.step5")),
      icon: step5Done ? Check : MapPin,
      done: step5Done,
      active: step4Done && !step5Done
    },
    {
      id: "step6",
      title: String(t("tracking.step6")),
      icon: step6Done ? Check : CheckCircle2,
      done: step6Done,
      active: step5Done && !step6Done
    }
  ];

  const getDisplayName = () => {
    if (latestIntervention) {
      if (latestIntervention.clientCompanyName) return latestIntervention.clientCompanyName;
      const first = latestIntervention.clientFirstName || "";
      const last = latestIntervention.clientLastName || "";
      if (first || last) return `${capitalizeName(first)} ${capitalizeName(last)}`.trim();
    }
    
    // Fallback to current profile
    if (profile?.companyName) return profile.companyName;
    const first = profile?.firstName || "";
    const last = profile?.lastName || "";
    if (first || last) return `${capitalizeName(first)} ${capitalizeName(last)}`.trim();
    
    return String(t("tracking.client_loading"));
  };

  return (
    <div
      data-testid="requester-tracking-panel"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent font-brand"
    >
      {/* Search Bar */}
      <div className="px-6 pt-6 pb-2">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={String(t("tracking.search_placeholder"))}
            className="w-full pl-10 pr-[76px] py-3 rounded-2xl bg-black/[0.03] border border-black/5 focus:bg-white focus:border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-[15px] font-medium placeholder:text-slate-400"
          />
          <Search className="absolute left-4 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
          
          <div className="absolute right-2 flex items-center gap-1">
            {searchInput.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                }}
                className="p-1.5 text-slate-400 hover:text-black transition-colors rounded-full hover:bg-black/5"
              >
                <X className="h-[16px] w-[16px]" />
              </button>
            )}
            <button
              type="submit"
              disabled={searchInput.trim().length === 0}
              className="p-1.5 bg-black text-white rounded-xl hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-[16px] w-[16px]" />
            </button>
          </div>
        </form>
      </div>

      <div className="relative flex-1 overflow-y-auto px-2 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {interventionLoading && !latestIntervention && !isSubmitting && requestData.description.trim().length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-black"
            />
          </div>
        ) : hasActiveUI ? (
          <div className="flex flex-col max-w-[320px] mx-auto min-h-full py-8">
            <div className="mb-6 pb-6 border-b border-black/5 text-center">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1.5 block">
                {t("tracking.file_of") || "Dossier de"}
              </span>
              <h2 className="text-[22px] font-extrabold text-black tracking-tight">
                {getDisplayName()}
              </h2>
            </div>
            <div className="relative flex flex-col gap-10 my-auto">
              {/* Ligne verticale subtile (fond) avec la ligne active à l'intérieur pour de vrais pourcentages */}
              <div className="absolute bottom-6 left-[23px] top-6 w-[2px] bg-black/[0.04] rounded-full overflow-hidden z-0">
                <motion.div 
                  className="absolute left-0 top-0 w-full bg-black origin-top"
                  initial={{ height: 0 }}
                  animate={{ height: step6Done ? '100%' : step5Done ? '83.33%' : step4Done ? '66.66%' : step3Done ? '50%' : step2Done ? '33.33%' : step1Done ? '16.66%' : '0%' }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </div>
              
              {steps.map((step, index) => {
                const Icon = step.icon;
                
                return (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: index * 0.1 }}
                    className={cn(
                      "relative z-10 flex gap-6 items-center transition-all duration-500",
                      !step.done && !step.active ? "opacity-30 grayscale" : ""
                    )}
                  >
                    <motion.div 
                      layout
                      transition={springTransition}
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                        step.done 
                          ? "bg-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]" 
                          : step.active 
                            ? "bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-black/5" 
                            : "bg-[#FAFAFA] text-slate-400 border border-black/5"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", step.active && !step.done && "animate-pulse")} />
                    </motion.div>
                    
                    <div className="flex flex-col justify-center">
                      <motion.span 
                        layout="position"
                        className={cn(
                          "text-[17px] font-bold tracking-tight transition-colors duration-500",
                          step.done || step.active ? "text-black" : "text-slate-500"
                        )}
                      >
                        {step.title}
                      </motion.span>
                      {step.active && !step.done && (
                        <motion.span
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-[13px] font-medium text-slate-500 mt-0.5"
                        >
                          {t("tracking.in_progress") || "En cours..."}
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="flex h-full flex-col items-center justify-center text-center px-4"
          >
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0, 0.03] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-black"
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#FAFAFA] text-slate-400 shadow-sm border border-black/5">
                <Search className="h-6 w-6" />
              </div>
            </div>
            <h3 className="mb-2 text-[19px] font-bold text-black tracking-tight">
              {isSearching ? `Aucune demande trouvée pour "${searchQuery}"` : (t("tracking.no_active_request") || "Aucune demande active")}
            </h3>
            <p className="text-[15px] font-medium text-slate-500 max-w-[260px] leading-relaxed">
              {isSearching 
                ? "Vérifiez l'orthographe de votre nom ou créez une nouvelle demande." 
                : (t("tracking.tracking_description") || "Le suivi en temps réel de votre intervention apparaîtra ici.")}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

