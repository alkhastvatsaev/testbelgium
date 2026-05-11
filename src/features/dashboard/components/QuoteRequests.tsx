"use client";
import React, { useState, useEffect } from 'react';
import { Mail, Check, SendHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateLocksmithQuote } from '@/utils/generateQuotePdf';
import { QUOTE_REQUESTS_PANEL_ID } from '@/features/dashboard/quoteRequestsPanelId';
import { GLASS_PANEL_BODY_SCROLL } from '@/core/ui/glassPanelChrome';
import {
  applyQuoteRequestOrder,
  moveAllSentToEnd,
  moveItemToEndById,
  type QuoteRequestRow,
} from '@/features/dashboard/quoteRequestsOrder';

const baseRequests: QuoteRequestRow[] = [
  {
    id: 1,
    clientName: "M. Dupont",
    service: "Installation électrique",
    days: 0,
    status: "Nouveau",
  },
  {
    id: 2,
    clientName: "Mme Martin",
    service: "Mise aux normes",
    days: 0,
    status: "Nouveau",
  },
  {
    id: 3,
    clientName: "Société ABC",
    service: "Borne de recharge",
    days: 1,
    status: "En attente",
  },
  {
    id: 4,
    clientName: "M. Leroy",
    service: "Dépannage urgent",
    days: 1,
    status: "En attente",
  }
];

const QUOTE_GENERATED_STORAGE_KEY = "quote_generated_states";
/** Nouvelle clé : reset des statuts « mail envoyé » (les anciennes entrées `quote_sent_states` sont ignorées). */
const QUOTE_SENT_STORAGE_KEY = "quote_sent_states_v2";
/** Ordre des lignes (ids) après envois mail — conservé au rechargement. */
const QUOTE_REQUEST_ORDER_KEY = "quote_requests_order_v1";

function buildPendingRequests(): QuoteRequestRow[] {
  return Array.from({ length: 50 }, (_, i) => {
    if (i < baseRequests.length) return baseRequests[i];

    const names = [
      "M. Bernard",
      "Mme Dubois",
      "Société XYZ",
      "M. Petit",
      "Mme Roux",
      "M. Richard",
      "SARL Durand",
      "M. Morel",
      "Mme Blanc",
      "M. Simon",
    ];
    const services = [
      "Installation électrique",
      "Mise aux normes",
      "Borne de recharge",
      "Dépannage urgent",
      "Rénovation",
      "Domotique",
    ];

    return {
      id: i + 1,
      clientName: names[i % names.length],
      service: services[i % services.length],
      days: Math.floor((i - 4) / 5) + 2,
      status: i % 4 === 0 ? "Nouveau" : "En attente",
    };
  });
}

export default function QuoteRequests() {
  const [requests, setRequests] = useState<QuoteRequestRow[]>(() => buildPendingRequests());
  const [generatedStates, setGeneratedStates] = useState<Record<number, boolean>>({});
  const [sendingStates, setSendingStates] = useState<Record<number, boolean>>({});
  const [sentStates, setSentStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("quote_sent_states");
      const savedGenerated = localStorage.getItem(QUOTE_GENERATED_STORAGE_KEY);
      const savedSent = localStorage.getItem(QUOTE_SENT_STORAGE_KEY);
      const savedOrder = localStorage.getItem(QUOTE_REQUEST_ORDER_KEY);

      if (savedGenerated) {
        setGeneratedStates(JSON.parse(savedGenerated) as Record<number, boolean>);
      }

      let sentMap: Record<number, boolean> = {};
      if (savedSent) {
        sentMap = JSON.parse(savedSent) as Record<number, boolean>;
        setSentStates(sentMap);
      }

      const base = buildPendingRequests();
      let ordered: QuoteRequestRow[] = base;
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder) as number[];
          if (Array.isArray(orderIds)) {
            ordered = applyQuoteRequestOrder(base, orderIds);
          }
        } catch {
          /* conserver ordered */
        }
      }

      const next = moveAllSentToEnd(ordered, sentMap);
      setRequests(next);

      try {
        localStorage.setItem(QUOTE_REQUEST_ORDER_KEY, JSON.stringify(next.map((r) => r.id)));
      } catch {
        /* quota */
      }
    } catch (e) {
      console.error("Error loading quote states", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(generatedStates).length > 0) {
      localStorage.setItem(QUOTE_GENERATED_STORAGE_KEY, JSON.stringify(generatedStates));
    }
  }, [generatedStates]);

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(sentStates).length > 0) {
      localStorage.setItem(QUOTE_SENT_STORAGE_KEY, JSON.stringify(sentStates));
    }
  }, [sentStates]);

  const handleSendEmail = async (e: React.MouseEvent, id: number, clientName: string) => {
    e.stopPropagation();
    if (!generatedStates[id] || sendingStates[id] || sentStates[id]) return;

    setSendingStates(prev => ({ ...prev, [id]: true }));

    try {
      // Générer le PDF en base64 juste avant l'envoi
      const pdfBase64 = generateLocksmithQuote(clientName, true);

      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          message: `Veuillez trouver ci-joint votre devis détaillé.`,
          pdfBase64
        }),
      });

      if (response.ok) {
        setSentStates(prev => ({ ...prev, [id]: true }));
        setRequests((prev) => {
          const next = moveItemToEndById(prev, id);
          try {
            localStorage.setItem(QUOTE_REQUEST_ORDER_KEY, JSON.stringify(next.map((r) => r.id)));
          } catch {
            /* ignore quota */
          }
          return next;
        });
      } else {
        const errorData = await response.json();
        console.error("Erreur API Email:", errorData.error || errorData);
        alert(`Erreur d'envoi: ${errorData.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      alert("Erreur réseau lors de l'envoi.");
    } finally {
      setSendingStates(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div
      id={QUOTE_REQUESTS_PANEL_ID}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
    >
      {/* Zone scroll + marges : la coque `overflow-hidden` ne doit pas couper les ombres. */}
      <div className={`${GLASS_PANEL_BODY_SCROLL} flex flex-col gap-5`}>
        {requests.map((req, index) => {
          const isNew = req.status === "Nouveau";
          const cardClass = isNew
            ? "shadow-[0_8px_24px_-8px_rgba(59,130,246,0.4)] hover:shadow-[0_14px_32px_-10px_rgba(59,130,246,0.5)] ring-1 ring-blue-500/30"
            : "shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] hover:shadow-[0_14px_32px_-10px_rgba(15,23,42,0.18)]";

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`group relative grid cursor-pointer grid-cols-3 items-center gap-2 rounded-[20px] bg-white px-4 py-4 transition-all duration-300 hover:bg-white ${cardClass}`}
            >
              {/* Gauche : Bouton DEVIS IA */}
              <div className="flex justify-start">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generateLocksmithQuote(req.clientName);
                    setGeneratedStates(prev => ({ ...prev, [req.id]: true }));
                  }}
                  className="relative flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-full transition-all duration-300 hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-sm group/btn shrink-0"
                  title="Générer un devis"
                >
                  {/* Paper Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute w-5 h-5 text-white transition-all duration-300 group-hover/btn:opacity-0 group-hover/btn:scale-50 group-hover/btn:-rotate-90">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {/* Plus Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute w-5 h-5 text-white transition-all duration-300 opacity-0 scale-50 rotate-90 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:rotate-0">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>

              {/* Milieu : Nom du client */}
              <h3 className="text-[14px] font-semibold text-slate-800 truncate text-center">
                {req.clientName}
              </h3>

              {/* Droite : Bouton Mail (débloqué après génération) */}
              <div className="flex justify-end">
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: generatedStates[req.id] ? 1 : 0.3, 
                    scale: 1 
                  }}
                  disabled={!generatedStates[req.id] || sendingStates[req.id] || sentStates[req.id]}
                  onClick={(e) => handleSendEmail(e, req.id, req.clientName)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-sm shrink-0 group/mailbtn relative
                    ${sentStates[req.id] ? 'bg-emerald-500 text-white' : 
                      generatedStates[req.id] ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 cursor-pointer' : 
                      'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {sendingStates[req.id] ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : sentStates[req.id] ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <>
                      <Mail className="absolute w-5 h-5 transition-all duration-300 group-hover/mailbtn:opacity-0 group-hover/mailbtn:scale-50 group-hover/mailbtn:-rotate-90" />
                      <SendHorizontal className="absolute w-5 h-5 transition-all duration-300 opacity-0 scale-50 rotate-90 group-hover/mailbtn:opacity-100 group-hover/mailbtn:scale-100 group-hover/mailbtn:rotate-0" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
