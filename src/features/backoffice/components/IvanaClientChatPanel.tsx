"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/core/config/firebase";
import { cn } from "@/lib/utils";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const STORAGE_PREFIX = "map-belgique-ivana-chat-v1";

export type IvanaChatMessage = {
  id: string;
  role: "user" | "ivana";
  text: string;
  createdAt: number;
};

function pickIvanaReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/\burgent|urgence|immédiat|rapide\b/.test(t)) {
    return "Pour une urgence, indiquez votre adresse complète et un numéro joignable ; le back-office traite ces dossiers en priorité.";
  }
  if (/\bfacture|facturation|paiement|devis\b/.test(t)) {
    return "Pour la facturation ou un devis, précisez le nom sur le dossier ou les derniers chiffres de l’intervention : je transmets au service concerné.";
  }
  if (/\brdv|rendez-vous|créneau|horaire|planif\b/.test(t)) {
    return "Pour modifier un créneau, indiquez la date souhaitée et la commune ; le back-office vous confirmera la planification.";
  }
  if (/\bmerci|thanks\b/.test(t)) {
    return "Avec plaisir ! N’hésitez pas si vous avez d’autres questions.";
  }
  return "Merci pour votre message. Le back-office a bien été notifié et reprendra avec vous très vite. Vous pouvez aussi déposer une demande depuis l’espace société si besoin.";
}

function welcomeMessage(): IvanaChatMessage {
  return {
    id: "welcome",
    role: "ivana",
    text: "Bonjour — écrivez-nous pour toute question sur une intervention, un rendez-vous ou une facture. Le back-office vous répondra ici.",
    createdAt: Date.now(),
  };
}

export default function IvanaClientChatPanel({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<IvanaChatMessage[]>(() => [welcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [ivanaTyping, setIvanaTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${user?.uid ?? "anonymous"}`,
    [user?.uid],
  );

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    hydratedRef.current = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as IvanaChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!cancelled) {
            setMessages(parsed);
            hydratedRef.current = true;
          }
          return;
        }
      }
    } catch {
      /* ignore */
    }
    if (!cancelled) {
      setMessages([welcomeMessage()]);
      hydratedRef.current = true;
    }
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current || typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, ivanaTyping]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || ivanaTyping) return;

    const userMsg: IvanaChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    setDraft("");
    setMessages((prev) => [...prev, userMsg]);
    setIvanaTyping(true);

    const delay = 700 + Math.floor(Math.random() * 600);
    window.setTimeout(() => {
      const reply: IvanaChatMessage = {
        id: `i-${Date.now()}`,
        role: "ivana",
        text: pickIvanaReply(text),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      setIvanaTyping(false);
    }, delay);
  }, [draft, ivanaTyping]);

  return (
    <div
      data-testid="ivana-client-chat-panel"
      style={outfit}
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
    >
      <div
        ref={listRef}
        className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-3 px-3 py-4")}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid={m.role === "user" ? "ivana-chat-bubble-user" : "ivana-chat-bubble-ivana"}
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-[20px] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                m.role === "user"
                  ? "rounded-br-md bg-blue-600 text-white"
                  : "rounded-bl-md border border-slate-200/80 bg-white text-slate-800",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {ivanaTyping ? (
          <div className="flex justify-start" data-testid="ivana-chat-typing">
            <div className="rounded-[20px] rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 text-[12px] font-medium text-slate-500 shadow-sm">
              Réponse en cours
              <span className="inline-flex gap-0.5 pl-1">
                <span className="animate-pulse">·</span>
                <span className="animate-pulse [animation-delay:150ms]">·</span>
                <span className="animate-pulse [animation-delay:300ms]">·</span>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/80 p-3 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <label htmlFor="ivana-chat-input" className="sr-only">
            Votre message
          </label>
          <textarea
            id="ivana-chat-input"
            data-testid="ivana-chat-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Votre message…"
            className="max-h-28 min-h-[44px] flex-1 resize-y rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            data-testid="ivana-chat-send"
            onClick={send}
            disabled={!draft.trim() || ivanaTyping}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-indigo-600 text-white shadow-md transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Envoyer le message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
