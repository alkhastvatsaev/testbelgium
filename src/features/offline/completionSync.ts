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

  await completionQueuePut(record);
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

  try {
    await performCompletionUpload(params);
    return { outcome: "sent" };
  } catch (e) {
    if (isLikelyNetworkFailure(e)) {
      return enqueueCompletionPayload(params);
    }
    return { outcome: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export type FlushCompletionReport = {
  uploaded: number;
  skippedConflict: number;
  failed: number;
};

/** Vide la file (réseau requis pour Storage + lecture conflit Firestore). */
export async function flushCompletionQueue(
  onConflictSkip?: (interventionId: string) => void,
): Promise<FlushCompletionReport> {
  const report: FlushCompletionReport = { uploaded: 0, skippedConflict: 0, failed: 0 };

  if (typeof window === "undefined" || !firestore || !navigator.onLine) {
    return report;
  }

  const rows = await completionQueueGetAll().catch(() => [] as CompletionQueueRecord[]);
  const sorted = [...rows].sort((a, b) => a.queuedAtMs - b.queuedAtMs);

  for (const rec of sorted) {
    try {
      const snap = await getDoc(doc(firestore, "interventions", rec.interventionId));
      const d = snap.exists() ? snap.data() : null;
      const remoteStatus = d?.status as string | undefined;
      const remoteCompletedAt = (d?.completedAt ?? undefined) as Timestamp | undefined;

      if (remoteCompletionIsNewerThanQueued(remoteStatus, remoteCompletedAt, rec.queuedAtMs)) {
        await completionQueueDelete(rec.localId);
        report.skippedConflict += 1;
        onConflictSkip?.(rec.interventionId);
        continue;
      }

      await performCompletionUpload({
        interventionId: rec.interventionId,
        photoDataUrls: rec.photoDataUrls,
        signaturePngDataUrl: rec.signaturePngDataUrl,
      });

      await completionQueueDelete(rec.localId);
      report.uploaded += 1;
    } catch {
      report.failed += 1;
    }
  }

  notifyCompletionQueueChanged();
  return report;
}
