"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  CloudOff,
  CreditCard,
  Lock,
  Plus,
  RefreshCw,
  SendHorizontal,
  Ticket,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspace } from "@/context/CompanyWorkspaceContext";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { navigateCompanyHub, COMPANY_HUB_ANCHOR_SMART_FORM } from "@/features/company/companyHubNavigation";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const glassRow =
  "flex items-center gap-3 rounded-[20px] bg-white/85 px-3 py-2.5 backdrop-blur-sm shadow-[0_6px_20px_-8px_rgba(15,23,42,0.12)]";

const iconRail =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-slate-500 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.1)]";

const inputClass =
  "min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-white/95 px-3 py-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15";

const selectClass =
  "min-w-0 flex-1 cursor-pointer appearance-none rounded-[14px] border border-black/[0.06] bg-white/95 py-2 pl-3 pr-10 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15";

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <div data-testid="company-space-panel" style={outfit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-3`}>{children}</div>
    </div>
  );
}

function OfflineGlyph({
  testId,
  ariaLabel,
  overlay: Overlay,
}: {
  testId: string;
  ariaLabel: string;
  overlay: typeof CloudOff | typeof Lock;
}) {
  return (
    <div
      data-testid={testId}
      aria-label={ariaLabel}
      className="flex flex-1 flex-col items-center justify-center py-14"
    >
      <div className="relative">
        <Building2 className="h-[4.5rem] w-[4.5rem] text-slate-300/90" aria-hidden />
        <Overlay
          className="absolute -bottom-0.5 -right-0.5 h-9 w-9 rounded-full border border-black/[0.06] bg-white/95 p-1.5 text-slate-500 shadow-md"
          aria-hidden
        />
      </div>
    </div>
  );
}

export default function CompanySpacePanel() {
  const pager = useDashboardPagerOptional();
  const {
    firebaseUid,
    memberships,
    activeCompanyId,
    setActiveCompanyId,
    activeRole,
    refreshClaimsSilent,
  } = useCompanyWorkspace();

  const [companyName, setCompanyName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteDocId, setInviteDocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimsPreview, setClaimsPreview] = useState<string | null>(null);
  const [invitesCount, setInvitesCount] = useState(0);

  const isAdmin = activeRole === "admin";

  useEffect(() => {
    if (!firestore || !firebaseUid || !activeCompanyId || !isAdmin) {
      setInvitesCount(0);
      return () => {};
    }

    const q = query(collection(firestore, "company_invites"), where("invitedByUid", "==", firebaseUid));
    return onSnapshot(
      q,
      (snap) => {
        const n = snap.docs.filter((d) => (d.data() as { companyId?: string }).companyId === activeCompanyId).length;
        setInvitesCount(n);
      },
      () => setInvitesCount(0),
    );
  }, [firestore, firebaseUid, activeCompanyId, isAdmin]);

  const createCompany = async () => {
    const name = companyName.trim();
    if (!firestore || !auth?.currentUser || !name) {
      toast.error("Nom requis");
      return;
    }
    setBusy(true);
    try {
      const user = auth.currentUser;
      const cref = await addDoc(collection(firestore, "companies"), {
        name,
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
      });
      await setDoc(doc(firestore, "users", user.uid, "company_memberships", cref.id), {
        role: "admin",
        joinedAt: serverTimestamp(),
        companyName: name,
      });
      setCompanyName("");
      await refreshClaimsSilent();
      toast.success("Société créée");
    } catch (e) {
      console.error(e);
      toast.error("Création impossible", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const submitInvite = async () => {
    const phone = invitePhone.trim();
    if (!firestore || !auth?.currentUser || !activeCompanyId || !phone) {
      toast.error("Société ou contact manquant");
      return;
    }
    if (!isAdmin) return;

    setBusy(true);
    try {
      await addDoc(collection(firestore, "company_invites"), {
        companyId: activeCompanyId,
        phone,
        role: "collaborateur",
        createdAt: serverTimestamp(),
        invitedByUid: auth.currentUser.uid,
      });
      setInvitePhone("");
      toast.success("Invitation enregistrée");
    } catch (e) {
      console.error(e);
      toast.error("Échec invitation", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const acceptInvite = async () => {
    const id = inviteDocId.trim();
    if (!auth?.currentUser || !id) {
      toast.error("ID invitation manquant");
      return;
    }
    setBusy(true);
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const res = await fetch("/api/company/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ inviteId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || res.statusText);
      setInviteDocId("");
      await refreshClaimsSilent();
      toast.success("Invitation acceptée");
    } catch (e) {
      console.error(e);
      toast.error("Acceptation impossible", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const syncClaims = useCallback(async () => {
    if (!auth?.currentUser) {
      toast.error("Connexion requise");
      return;
    }
    setBusy(true);
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const res = await fetch("/api/company/sync-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ activeCompanyId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        claims?: { bmTenants?: string[]; bmActive?: string | null };
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || res.statusText);
      setClaimsPreview(JSON.stringify(data.claims ?? {}, null, 2));
      await auth.currentUser.getIdToken(true);
      toast.success("Token mis à jour");
    } catch (e) {
      console.error(e);
      toast.error("Sync impossible", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [activeCompanyId]);

  const activeCompanyLabel = useMemo(() => {
    return memberships.find((m) => m.companyId === activeCompanyId)?.companyName ?? "";
  }, [memberships, activeCompanyId]);

  if (!isConfigured && !devUiPreviewEnabled) {
    return (
      <PanelShell>
        <OfflineGlyph testId="company-panel-offline" ariaLabel="Firebase non configuré" overlay={CloudOff} />
      </PanelShell>
    );
  }

  if (!firebaseUid && memberships.length === 0) {
    return (
      <PanelShell>
        <OfflineGlyph testId="company-panel-offline" ariaLabel="Connexion requise" overlay={Lock} />
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className={`${glassRow} relative`}>
        <span className={iconRail}>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </span>
        <select
          data-testid="company-switcher"
          aria-label="Choisir une organisation cliente"
          className={selectClass}
          value={activeCompanyId}
          onChange={(e) => setActiveCompanyId(e.target.value)}
          disabled={memberships.length === 0}
        >
          {memberships.length === 0 ? (
            <option value="">—</option>
          ) : (
            memberships.map((m) => (
              <option key={m.companyId} value={m.companyId}>
                {m.companyName}
              </option>
            ))
          )}
        </select>
      </div>

      {pager && memberships.length > 0 && activeCompanyId ? (
        <div className={glassRow}>
          <span className={iconRail}>
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <button
            type="button"
            data-testid="company-open-intervention-form-btn"
            className="min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-white/95 px-3 py-2 text-left text-sm font-medium text-slate-800 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-900/15"
            aria-label="Ouvrir le formulaire de demande d’intervention"
            onClick={() => navigateCompanyHub(pager, COMPANY_HUB_ANCHOR_SMART_FORM)}
          >
            Nouvelle demande d’intervention
          </button>
        </div>
      ) : null}

      <div className={glassRow}>
        <span className={iconRail}>
          <Plus className="h-5 w-5" aria-hidden />
        </span>
        <input
          data-testid="company-name-input"
          type="text"
          aria-label="Nom de la nouvelle organisation"
          autoComplete="organization"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          data-testid="company-create-btn"
          aria-label="Créer organisation"
          disabled={busy || !companyName.trim()}
          onClick={() => void createCompany()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-35"
        >
          <Check className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className={glassRow}>
        <span className={iconRail}>
          <Ticket className="h-5 w-5" aria-hidden />
        </span>
        <input
          data-testid="accept-invite-input"
          type="text"
          aria-label="Identifiant invitation Firestore"
          value={inviteDocId}
          onChange={(e) => setInviteDocId(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          data-testid="accept-invite-btn"
          aria-label="Accepter invitation"
          disabled={busy || !inviteDocId.trim()}
          onClick={() => void acceptInvite()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-35"
        >
          <Check className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {isAdmin ? (
        <div className={glassRow}>
          <span className={`relative ${iconRail}`}>
            <UserPlus className="h-5 w-5" aria-hidden />
            {invitesCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold tabular-nums text-white">
                {invitesCount > 9 ? "9+" : invitesCount}
              </span>
            ) : null}
          </span>
          <input
            type="text"
            inputMode="tel"
            data-testid="invite-phone-input"
            aria-label="Coordonnées à inviter"
            autoComplete="tel"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            data-testid="invite-submit-btn"
            aria-label="Envoyer invitation"
            disabled={busy || !invitePhone.trim() || !activeCompanyId}
            onClick={() => void submitInvite()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-35"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {isAdmin ? (
        <div
          data-testid="company-billing-strip"
          className={`${glassRow} border-amber-200/40 bg-amber-50/50`}
          aria-label={`Facturation entreprise ${activeCompanyLabel}`}
        >
          <span className={`${iconRail} border-amber-200/60 bg-white text-amber-900`}>
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-[12px] font-medium text-amber-950/90">
            Facturation / abonnement — réservé admin — Stripe à brancher.
          </div>
          <Lock className="h-4 w-4 shrink-0 text-amber-800/50" aria-hidden />
        </div>
      ) : null}

      <div className="mt-auto flex shrink-0 justify-end pt-1">
        <button
          type="button"
          data-testid="sync-claims-btn"
          aria-label="Synchroniser jeton serveur"
          disabled={busy || memberships.length === 0}
          onClick={() => void syncClaims()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.08] bg-white/95 text-slate-700 shadow-sm transition-colors hover:bg-white disabled:opacity-35"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {claimsPreview ? (
        <pre
          data-testid="claims-preview"
          className="max-h-20 overflow-auto rounded-[12px] border border-white/10 bg-slate-900/92 p-2 font-mono text-[10px] leading-snug text-emerald-100/95 custom-scrollbar"
        >
          {claimsPreview}
        </pre>
      ) : null}
    </PanelShell>
  );
}
