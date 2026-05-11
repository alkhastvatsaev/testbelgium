import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { runAutoInvoiceGeneration } from "./invoiceAutomation";

admin.initializeApp();

function publicOrigin(): string {
  const raw = process.env.PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

function assignmentLink(interventionId: string): string {
  return `${publicOrigin()}/?bmTechCase=${encodeURIComponent(interventionId)}`;
}

function reminderLink(): string {
  return `${publicOrigin()}/?bmTechReminder=1`;
}

async function listTokens(uid: string): Promise<string[]> {
  const snap = await admin.firestore().collection("users").doc(uid).collection("fcm_tokens").get();
  return snap.docs.map((d) => (d.data().token as string) ?? "").filter((t) => t.length > 0);
}

async function sendToTokens(
  tokens: string[],
  payload: Omit<admin.messaging.MulticastMessage, "tokens">,
): Promise<void> {
  if (!tokens.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    ...payload,
  });
  logger.info("FCM sendEachForMulticast", { ok: res.successCount, fail: res.failureCount });
}

/** Facture PDF automatique lorsque statut « terminé » + photos + signature. */
export const autoInvoiceOnInterventionWrite = onDocumentWritten(
  {
    document: "interventions/{interventionId}",
    region: "europe-west1",
  },
  async (event) => {
    await runAutoInvoiceGeneration(event);
  },
);

/** Envoi lorsque `assignedTechnicianUid` passe à un nouvel utilisateur. */
export const notifyTechnicianInterventionAssigned = onDocumentWritten(
  {
    document: "interventions/{interventionId}",
    region: "europe-west1",
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const before = beforeSnap?.exists ? beforeSnap.data() : undefined;
    const after = afterSnap?.exists ? afterSnap.data() : undefined;
    if (!after) return;

    const prevUid = typeof before?.assignedTechnicianUid === "string" ? before.assignedTechnicianUid : "";
    const nextUid = typeof after.assignedTechnicianUid === "string" ? after.assignedTechnicianUid : "";

    if (!nextUid || nextUid === prevUid) return;

    const titleLine =
      typeof after.title === "string" && after.title.length > 0 ? after.title.slice(0, 120) : "Nouvelle intervention";

    const tokens = await listTokens(nextUid);
    if (!tokens.length) {
      logger.info("Assignment notify skipped — no tokens", { uid: nextUid });
      return;
    }

    const interventionId = event.params.interventionId as string;
    const link = assignmentLink(interventionId);

    await sendToTokens(tokens, {
      notification: {
        title: "Nouvelle intervention",
        body: titleLine,
      },
      data: {
        type: "assignment",
        interventionId,
      },
      webpush: {
        fcmOptions: { link },
      },
    });
  },
);

/** Rappel quotidien 17h Europe/Brussels pour les dossiers non terminés encore assignés. */
export const technicianDailyReminder1700 = onSchedule(
  {
    schedule: "0 17 * * *",
    timeZone: "Europe/Brussels",
    region: "europe-west1",
  },
  async () => {
    const db = admin.firestore();
    const statuses = ["pending", "in_progress", "pending_needs_address"];
    const snap = await db.collection("interventions").where("status", "in", statuses).get();

    const counts = new Map<string, number>();
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const uid = typeof d.assignedTechnicianUid === "string" ? d.assignedTechnicianUid : "";
      if (!uid) continue;
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }

    const link = reminderLink();

    for (const [uid, n] of counts) {
      if (n < 1) continue;
      const tokens = await listTokens(uid);
      if (!tokens.length) continue;

      const body =
        n === 1 ? "Tu as encore 1 intervention en cours" : `Tu as encore ${n} interventions en cours`;

      await sendToTokens(tokens, {
        notification: {
          title: "Rappel interventions",
          body,
        },
        data: {
          type: "daily_reminder",
          openDashboard: "1",
        },
        webpush: {
          fcmOptions: { link },
        },
      });
    }
  },
);
