"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, and } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { motion, AnimatePresence } from "framer-motion";
import { Check, FileText, MapPin, Search, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Intervention } from "@/features/interventions/types";
import { capitalizeName } from "@/utils/stringUtils";

const springTransition = { type: "spring", bounce: 0, duration: 0.5 };
export default function AdminValidationPanel() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const workspace = useCompanyWorkspaceOptional();
  const activeCompanyId = workspace?.activeCompanyId || "";
  
  useEffect(() => {
    if (!firestore || !activeCompanyId) {
      setLoading(false);
      return;
    }

    // We query interventions that are "done" or "invoiced" for the active company
    // and sort in memory to avoid requiring a composite index if possible.
    // NOTE: Querying with both "status" and "companyId" will likely require a composite index.
    const q = query(
      collection(firestore, "interventions"),
      where("companyId", "==", activeCompanyId),
      where("status", "in", ["done", "invoiced"])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
          // Sort in memory by createdAt descending
          data.sort((a, b) => {
            const tA = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : (a.createdAt as any)?.toMillis?.() || 0;
            const tB = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : (b.createdAt as any)?.toMillis?.() || 0;
            return tB - tA;
          });
        setInterventions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur lors du chargement des interventions:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeCompanyId]);

  const handleVerify = async (id: string, currentStatus: string) => {
    if (!firestore) return;
    try {
      // Just a visual confirmation or setting a custom flag if needed.
      // If we want to change status or add a flag:
      await updateDoc(doc(firestore, "interventions", id), {
        ivanaVerified: true,
      });
      // For now we don't hide it necessarily, but we could filter it out.
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
    }
  };

  return (
    <div
      data-testid="admin-validation-panel"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border-l border-white/40 font-brand"
    >


      <div className="relative flex-1 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-black"
            />
          </div>
        ) : interventions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 opacity-70">
            <Check className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Aucun rapport</h3>
            <p className="text-sm text-slate-500">Tous les rapports ont été traités.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {interventions.map((iv) => {
              const isExpanded = expandedId === iv.id;
              // @ts-ignore : ivanaVerified custom flag
              const isVerified = iv.ivanaVerified;

              const getDisplayName = () => {
                if (iv.clientCompanyName) return iv.clientCompanyName;
                const first = iv.clientFirstName || "";
                const last = iv.clientLastName || "";
                if (first || last) return `${capitalizeName(first)} ${capitalizeName(last)}`.trim();
                return iv.clientName || "Client inconnu";
              };

              return (
                <motion.div
                  key={iv.id}
                  layout
                  className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
                >
                  <div
                    className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-black/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : iv.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-black text-[16px] truncate max-w-[200px]">
                        {getDisplayName()}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isVerified ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" /> Vérifié
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            À vérifier
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{iv.address || "Adresse inconnue"}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 border-t border-black/5 mt-2 flex flex-col gap-4">
                          <div className="pt-2">
                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Problème</h4>
                            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {iv.problem || "Aucune description fournie."}
                            </p>
                          </div>

                          {iv.completionPhotoUrls && iv.completionPhotoUrls.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Photos de fin
                              </h4>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {iv.completionPhotoUrls.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img
                                      src={url}
                                      alt={`Photo ${idx + 1}`}
                                      className="h-20 w-20 object-cover rounded-xl border border-black/5 shadow-sm"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {iv.completionSignatureUrl && (
                            <div>
                              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Signature Client</h4>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-center">
                                <img
                                  src={iv.completionSignatureUrl}
                                  alt="Signature"
                                  className="h-16 object-contain"
                                />
                              </div>
                            </div>
                          )}

                          {!isVerified && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerify(iv.id, iv.status);
                              }}
                              className="mt-2 w-full py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                            >
                              <Check className="h-4 w-4" /> Marquer comme vérifié
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
