import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import "@/core/config/firebase-admin";

/**
 * Synchronise les custom claims Firebase à partir des documents
 * `users/{uid}/company_memberships/*`.
 *
 * Claims (`bmTenants`) : tableau compact `"companyId:role"` pour rester sous la limite de taille.
 */
export async function POST(req: Request) {
  if (!admin.apps.length) {
    return NextResponse.json(
      { ok: false, error: "Firebase Admin non configuré (variables serveur manquantes)." },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token manquant." }, { status: 401 });
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "Token invalide." }, { status: 401 });
  }

  const uid = decoded.uid;
  const db = admin.firestore();
  const snap = await db.collection(`users/${uid}/company_memberships`).get();

  const tenants = snap.docs.map((d) => {
    const role = (d.data().role as string) === "admin" ? "admin" : "collaborateur";
    return `${d.id}:${role}`;
  });

  let body: { activeCompanyId?: string } = {};
  try {
    body = (await req.json()) as { activeCompanyId?: string };
  } catch {
    /* ignore */
  }

  const fallbackActive = snap.docs[0]?.id ?? "";
  const activeCompanyId =
    typeof body.activeCompanyId === "string" && tenants.some((t) => t.startsWith(`${body.activeCompanyId}:`))
      ? body.activeCompanyId
      : fallbackActive;

  await admin.auth().setCustomUserClaims(uid, {
    bmTenants: tenants,
    bmActive: activeCompanyId || null,
  });

  return NextResponse.json({
    ok: true,
    claims: { bmTenants: tenants, bmActive: activeCompanyId || null },
  });
}
