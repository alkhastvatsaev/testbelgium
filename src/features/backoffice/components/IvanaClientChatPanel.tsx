"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ImagePlus, X } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/core/config/firebase";
import { cn } from "@/lib/utils";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import {
  publishClientPortalMessage,
  IVANA_PORTAL_MESSAGE_EVENT,
  type ClientPortalChatPayload,
} from "@/features/backoffice/ivanaChatPortalBridge";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const STORAGE_PREFIX = "map-belgique-ivana-chat-v1";
const CHAT_PERSISTENCE_ENABLED = false;

export type IvanaChatMessage = {
  id: string;
  role: "user" | "ivana" | "client";
  text: string;
  images?: string[];
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

type PanelProps = {
  className?: string;
  /** Hub société : chaque message utilisateur est envoyé au chat inbox (page carte). */
  publishAsPortal?: boolean;
  /** Inbox : affiche les messages envoyés depuis le portail client. */
  acceptPortalMessages?: boolean;
};

export default function IvanaClientChatPanel({
  className,
  publishAsPortal = false,
  acceptPortalMessages = false,
}: PanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<IvanaChatMessage[]>(() => [welcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [ivanaTyping, setIvanaTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const seenPortalIdsRef = useRef<Set<string>>(new Set());

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

    if (!CHAT_PERSISTENCE_ENABLED) {
      if (!cancelled) {
        setMessages([welcomeMessage()]);
        hydratedRef.current = true;
      }
      return () => {
        cancelled = true;
      };
    }

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
    if (!CHAT_PERSISTENCE_ENABLED) return;
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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Auto-resize: grow with content up to max-h, then scroll.
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 96); // px (matches max-h-24)
    el.style.height = `${Math.max(next, 48)}px`;
  }, [draft]);

  useEffect(() => {
    if (!acceptPortalMessages) return;
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<ClientPortalChatPayload>;
      const d = ce.detail;
      if (!d || typeof d.id !== "string") return;
      const mid = `portal-${d.id}`;
      if (seenPortalIdsRef.current.has(mid)) return;
      seenPortalIdsRef.current.add(mid);
      setMessages((prev) => [
        ...prev,
        {
          id: mid,
          role: "client" as const,
          text: d.text,
          images: d.images,
          createdAt: d.createdAt,
        },
      ]);
    };
    window.addEventListener(IVANA_PORTAL_MESSAGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(IVANA_PORTAL_MESSAGE_EVENT, handler as EventListener);
  }, [acceptPortalMessages]);

  const handlePickImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowed = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (allowed.length === 0) return;

    const MAX_FILES = 6;
    const MAX_TOTAL = 6;
    const remaining = Math.max(0, MAX_TOTAL - pendingImages.length);
    const sliced = allowed.slice(0, Math.min(MAX_FILES, remaining));

    const readOne = (file: File) =>
      new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = () => {
          const v = reader.result;
          resolve(typeof v === "string" ? v : null);
        };
        reader.readAsDataURL(file);
      });

    const newUrls = (await Promise.all(sliced.map(readOne))).filter(Boolean) as string[];
    if (newUrls.length > 0) setPendingImages((prev) => [...prev, ...newUrls]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pendingImages.length]);

  const send = useCallback(() => {
    const text = draft.trim();
    if ((!text && pendingImages.length === 0) || ivanaTyping) return;

    const userMsg: IvanaChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      images: pendingImages.length > 0 ? pendingImages : undefined,
      createdAt: Date.now(),
    };
    setDraft("");
    setPendingImages([]);
    setMessages((prev) => [...prev, userMsg]);
    if (publishAsPortal) {
      publishClientPortalMessage({
        id: userMsg.id,
        text: userMsg.text,
        images: userMsg.images,
        createdAt: userMsg.createdAt,
      });
    }
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
  }, [draft, ivanaTyping, pendingImages, publishAsPortal]);

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
            data-testid={
              m.role === "user"
                ? "ivana-chat-bubble-user"
                : m.role === "client"
                  ? "ivana-chat-bubble-client"
                  : "ivana-chat-bubble-ivana"
            }
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-[20px] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                m.role === "user"
                  ? "rounded-br-md bg-blue-600 text-white"
                  : m.role === "client"
                    ? "rounded-bl-md border border-emerald-200/90 bg-emerald-50 text-slate-900"
                    : "rounded-bl-md border border-slate-200/80 bg-white text-slate-800",
              )}
            >
              {m.role === "client" ? (
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-emerald-800/80">
                  Client (portail)
                </span>
              ) : null}
              {m.text}
              {m.images && m.images.length > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-1.5" data-testid="ivana-chat-bubble-images">
                  {m.images.map((url, idx) => (
                    <div
                      key={`${m.id}-img-${idx}`}
                      className={cn(
                        "aspect-square overflow-hidden rounded-[12px] bg-black/5",
                        m.role === "user"
                          ? "border border-white/40"
                          : "border border-black/10",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
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
        {pendingImages.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2" data-testid="ivana-chat-pending-images">
            {pendingImages.map((url, idx) => (
              <div
                key={`pending-${idx}`}
                className="group relative h-14 w-14 overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Retirer la photo"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePickImages(e.target.files)}
          />
          <button
            type="button"
            data-testid="ivana-chat-attach"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              "text-slate-500 transition",
              "hover:bg-slate-900/5 hover:text-slate-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
              "active:scale-[0.98]",
            )}
            aria-label="Ajouter des photos"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <label htmlFor="ivana-chat-input" className="sr-only">
            Votre message
          </label>
          <div className="flex min-w-0 flex-1 items-center rounded-[18px] border border-slate-200 bg-white shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <textarea
              id="ivana-chat-input"
              data-testid="ivana-chat-input"
              rows={1}
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Votre message…"
              className="min-h-12 max-h-24 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 text-[13px] leading-[18px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            data-testid="ivana-chat-send"
            onClick={send}
            disabled={(!draft.trim() && pendingImages.length === 0) || ivanaTyping}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
              "active:scale-[0.98]",
              (!draft.trim() && pendingImages.length === 0) || ivanaTyping
                ? "cursor-not-allowed text-slate-400 opacity-40"
                : "text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700",
            )}
            aria-label="Envoyer le message"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
