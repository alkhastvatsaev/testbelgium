/* eslint-disable no-console */
import { getAdminDb } from "@/core/config/firebase-admin";
import { DEMO_COMPANY_ID, isSyntheticInterventionId } from "@/core/config/devUiPreview";

type DryRun = boolean;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function deleteDocsByRefs(
  refs: FirebaseFirestore.DocumentReference[],
  opts: { dryRun: DryRun; label: string },
) {
  if (refs.length === 0) return;
  console.log(`[${opts.label}] matched: ${refs.length}`);
  if (opts.dryRun) return;

  for (const group of chunk(refs, 450)) {
    const batch = getAdminDb().batch();
    for (const r of group) batch.delete(r);
    await batch.commit();
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`cleanupDemoData starting (dryRun=${dryRun})`);

  const db = getAdminDb();

  // 1) Interventions: delete any doc under demo company OR known synthetic IDs (mock-day-*, 1/2/3, demo-mission-backoffice-only…)
  const interventionRefs: FirebaseFirestore.DocumentReference[] = [];

  // a) By companyId = demo-local-company
  const snapByCompany = await db
    .collection("interventions")
    .where("companyId", "==", DEMO_COMPANY_ID)
    .get();
  snapByCompany.docs.forEach((d) => interventionRefs.push(d.ref));

  // b) By synthetic IDs (scan IDs only; no full collection scan if large: we only delete known patterns)
  //    Firestore doesn't support "startsWith" on document id without modeling, so we do a limited scan by reading IDs only.
  //    If your collection is huge, keep `--dry-run` first and consider adding an indexable field like `isSynthetic`.
  const snapAllIds = await db.collection("interventions").select().get();
  for (const d of snapAllIds.docs) {
    if (isSyntheticInterventionId(d.id)) interventionRefs.push(d.ref);
  }

  // De-dup refs
  const uniqInterventionRefs = Array.from(new Map(interventionRefs.map((r) => [r.path, r])).values());
  await deleteDocsByRefs(uniqInterventionRefs, { dryRun, label: "interventions" });

  // 2) Duplicate alerts: delete demo company alerts OR alerts referencing synthetic intervention IDs
  const alertRefs: FirebaseFirestore.DocumentReference[] = [];

  const snapAlertsByCompany = await db
    .collection("intervention_duplicate_alerts")
    .where("companyId", "==", DEMO_COMPANY_ID)
    .get();
  snapAlertsByCompany.docs.forEach((d) => alertRefs.push(d.ref));

  const snapAlertsAll = await db.collection("intervention_duplicate_alerts").get();
  for (const d of snapAlertsAll.docs) {
    const data = d.data() as Record<string, unknown>;
    const a = typeof data.similarInterventionId === "string" ? data.similarInterventionId : "";
    const b = typeof data.newInterventionId === "string" ? data.newInterventionId : "";
    if (isSyntheticInterventionId(a) || isSyntheticInterventionId(b)) alertRefs.push(d.ref);
  }

  const uniqAlertRefs = Array.from(new Map(alertRefs.map((r) => [r.path, r])).values());
  await deleteDocsByRefs(uniqAlertRefs, { dryRun, label: "intervention_duplicate_alerts" });

  // 3) Chat messages: delete demo company chat messages
  const chatRefs: FirebaseFirestore.DocumentReference[] = [];
  const snapChatByCompany = await db
    .collection("portal_ivana_chat_messages")
    .where("companyId", "==", DEMO_COMPANY_ID)
    .get();
  snapChatByCompany.docs.forEach((d) => chatRefs.push(d.ref));
  await deleteDocsByRefs(chatRefs, { dryRun, label: "portal_ivana_chat_messages" });

  console.log("cleanupDemoData done");
  console.log(
    dryRun
      ? "Dry-run only: nothing was deleted. Re-run without --dry-run to delete."
      : "Deletion completed.",
  );
}

main().catch((e) => {
  console.error("cleanupDemoData failed:", e);
  process.exit(1);
});

