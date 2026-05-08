"use client";

import { useEffect, useState } from "react";
import { useRequesterHub } from "@/features/interventions/context/RequesterHubContext";
import { Check, Clock, MapPin, User } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

type TrackedIntervention = {
  id: string;
  status?: string;
  title?: string;
  problem?: string;
  address?: string;
  createdAt?: string;
};

function useMyLatestIntervention() {
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

      if (!user || !firestore) {
        setIntervention(null);
        setLoading(false);
        return;
      }

      const db = firestore;
      const q = query(collection(db, "interventions"), where("createdByUid", "==", user.uid));

      unsubSnap = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setIntervention(null);
        } else {
          // Sort locally by createdAt desc to avoid missing index errors
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackedIntervention);
          docs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setIntervention(docs[0]);
        }
        setLoading(false);
      });
    });

    return () => {
      if (unsubSnap) unsubSnap();
      unsubAuth();
    };
  }, []);

  return { intervention, loading };
}

const springTransition = { type: "spring", bounce: 0, duration: 0.5 } as const;

export default function RequesterTrackingPanel() {
  const { isSubmitting, requestData, lastSubmittedRequest } = useRequesterHub();
  const { intervention: latestIntervention, loading: interventionLoading } = useMyLatestIntervention();
  const [user, setUser] = useState(auth?.currentUser ?? null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const draftTitle = requestData.problemLabel.trim() || requestData.description.trim();
  const hasDraft = Boolean(draftTitle || requestData.interventionAddress.trim());
  const hasSubmitted = Boolean(latestIntervention || lastSubmittedRequest);
  const hasActiveUI = hasDraft || isSubmitting || hasSubmitted;

  const status = latestIntervention?.status || (lastSubmittedRequest ? "pending" : "draft");
  const step1Done = Boolean(latestIntervention || lastSubmittedRequest);
  const step2Done = step1Done && status !== "pending";
  const step3Done = step1Done && ["assigned", "in_progress", "done"].includes(status);
  const step4Done = step1Done && ["in_progress", "done"].includes(status);

  const steps = [
    {
      id: "step1",
      title: t("tracking.step1") || "Demande reçue",
      icon: step1Done ? Check : Clock,
      done: step1Done,
      active: !step1Done && (isSubmitting || hasDraft)
    },
    {
      id: "step2",
      title: t("tracking.step2") || "Recherche d'un technicien",
      icon: step2Done ? Check : Clock,
      done: step2Done,
      active: step1Done && !step2Done
    },
    {
      id: "step3",
      title: t("tracking.step3") || "Technicien assigné",
      icon: step3Done ? Check : User,
      done: step3Done,
      active: step2Done && !step3Done
    },
    {
      id: "step4",
      title: t("tracking.step4") || "En route / Sur place",
      icon: step4Done ? Check : MapPin,
      done: step4Done,
      active: step3Done && !step4Done
    }
  ];

  return (
    <div
      data-testid="requester-tracking-panel"
      style={outfit}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
    >
      <div className="relative flex-1 overflow-y-auto px-2 py-4">
        {interventionLoading && !latestIntervention && !isSubmitting && requestData.description.trim().length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-black"
            />
          </div>
        ) : hasActiveUI ? (
          <div className="flex flex-col justify-center max-w-[320px] mx-auto h-full">
            <div className="relative flex flex-col gap-10">
              {/* Ligne verticale subtile (fond) */}
              <div className="absolute bottom-6 left-[23px] top-6 w-[2px] bg-black/[0.04] rounded-full" />
              
              {/* Ligne verticale active */}
              <motion.div 
                className="absolute left-[23px] top-6 w-[2px] bg-black rounded-full origin-top"
                initial={{ height: 0 }}
                animate={{ height: step4Done ? '100%' : step3Done ? '66%' : step2Done ? '33%' : step1Done ? '10%' : '0%' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              
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
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <h3 className="mb-2 text-[19px] font-bold text-black tracking-tight">{t("tracking.no_active_request") || "Aucune demande active"}</h3>
            <p className="text-[15px] font-medium text-slate-500 max-w-[260px] leading-relaxed">
              {t("tracking.tracking_description") || "Le suivi en temps réel de votre intervention apparaîtra ici."}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

