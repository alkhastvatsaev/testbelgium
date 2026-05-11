import { doc, getDoc, type Timestamp } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { remoteCompletionIsNewerThanQueued } from "@/features/offline/completionConflict";
import {
  completionQueueDelete,
  completionQueueGetAll,
  completionQueuePut,
  completionQueueCount,
  type CompletionQueueRecord,
} from "@/features/offline/completionQueueDb";
import { performCompletionUpload } from "@/features/interventions/completionUploadCore";

const listeners = new Set<() => void>();

export function subscribeCompletionQueueChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyCompletionQueueChanged(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export async function getCompletionQueueLength(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    return await completionQueueCount();
  } catch {
    return 0;
  }
}

const IDB_PUT_TIMEOUT_MS = 15_000;

export async function enqueueCompletionRecord(payload: Omit<CompletionQueueRecord, "localId" | "queuedAtMs">): Promise<void> {
  const localId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const record: CompletionQueueRecord = {
    ...payload,
    localId,
    queuedAtMs: Date.now(),
  };

  await Promise.race([
    completionQueuePut(record),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("IndexedDB indisponible (navigateur privé, quota, ou blocage)")), IDB_PUT_TIMEOUT_MS),
    ),
  ]);
  notifyCompletionQueueChanged();
}

function isLikelyNetworkFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    offline ||
    /network|offline|failed to fetch|QUIC|ERR_INTERNET_DISCONNECTED|CLIENT_OFFLINE/i.test(msg)
  );
}

async function enqueueCompletionPayload(params: {
  interventionId: string;
  photoDataUrls: string[];
  signaturePngDataUrl: string;
}): Promise<{ outcome: "queued" } | { outcome: "error"; message: string }> {
  try {
    await enqueueCompletionRecord({
      interventionId: params.interventionId,
      photoDataUrls: params.photoDataUrls,
      signaturePngDataUrl: params.signaturePngDataUrl,
    });
    return { outcome: "queued" };
  } catch (e) {
    return { outcome: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export async function finalizeCompletionOfflineAware(params: {
  interventionId: string;
  photoDataUrls: string[];
  signaturePngDataUrl: string;
}): Promise<{ outcome: "sent" } | { outcome: "queued" } | { outcome: "error"; message: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return enqueueCompletionPayload(params);
  }

  /**
   * File d’attente : photos (parallèle) + signature + Firestore peuvent dépasser 2–3 min sur réseau réel.
   * `performCompletionUpload` borne aussi chaque étape ; ce plafond est une sécurité ultime.
   */
  const ONLINE_COMPLETION_TIMEOUT_MS = 360_000;

  try {
    const uploadPromise = performCompletionUpload(params);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Délai d'attente dépassé (réseau lent)")),
        ONLINE_COMPLETION_TIMEOUT_MS,
      );
    });

    await Promise.race([uploadPromise, timeoutPromise]);
    return { outcome: "sent" };
  } catch (e) {
    if (isLikelyNetworkFailure(e) || (e instanceof Error && e.message.includes("Délai d'attente"))) {
      return enqueueCompletionPayload(params);
    }
    return { outcome: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export type FlushCompletionReport = {
  uploaded: number;
  skippedConflict: number;
  failed: number;
  lastError?: string;
};

/** Vide la file (réseau requis pour Storage + lecture conflit Firestore). */
export async function flushCompletionQueue(
  onConflictSkip?: (interventionId: string) => void,
): Promise<FlushCompletionReport> {
  const report: FlushCompletionReport = { uploaded: 0, skippedConflict: 0, failed: 0 };

  if (typeof window === "undefined" || !firestore || !navigator.onLine) {
    return report;
  }

  const db = firestore;

  /** Même logique que l’envoi direct : plusieurs fichiers Storage + Firestore. */
  const FLUSH_ITEM_TIMEOUT_MS = 180_000;

  const rows = await completionQueueGetAll().catch(() => [] as CompletionQueueRecord[]);
  const sorted = [...rows].sort((a, b) => a.queuedAtMs - b.queuedAtMs);

  for (const rec of sorted) {
    try {
      const timeoutPromise = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), FLUSH_ITEM_TIMEOUT_MS),
      );

      const processItem = async (): Promise<"skipped" | "uploaded"> => {
        const snap = await getDoc(doc(db, "interventions", rec.interventionId));
        const d = snap.exists() ? snap.data() : null;
        const remoteStatus = d?.status as string | undefined;
        const remoteCompletedAt = (d?.completedAt ?? undefined) as Timestamp | undefined;

        if (remoteCompletionIsNewerThanQueued(remoteStatus, remoteCompletedAt, rec.queuedAtMs)) {
          await completionQueueDelete(rec.localId);
          onConflictSkip?.(rec.interventionId);
          return "skipped";
        }

        await performCompletionUpload({
          interventionId: rec.interventionId,
          photoDataUrls: rec.photoDataUrls,
          signaturePngDataUrl: rec.signaturePngDataUrl,
        });

        await completionQueueDelete(rec.localId);
        return "uploaded";
      };

      const result = await Promise.race([processItem(), timeoutPromise]);
      if (result === "timeout") {
        throw new Error("Délai d'attente dépassé");
      } else if (result === "skipped") {
        report.skippedConflict += 1;
      } else {
        report.uploaded += 1;
      }
    } catch (err: any) {
      console.warn(`Failed to upload intervention ${rec.interventionId}:`, err);
      report.failed += 1;
      report.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  notifyCompletionQueueChanged();
  return report;
}
