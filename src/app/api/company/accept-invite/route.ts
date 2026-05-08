import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import "@/core/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function phonesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da === db) return true;
  // Tolère préfixes pays différents si suffixe suffisant
  return da.length >= 9 && db.length >= 9 && (da.endsWith(db.slice(-9)) || db.endsWith(da.slice(-9)));
}

/**
 * Accepte une invitation : crée le doc membership collaborateur (Admin SDK, hors rules client).
 * Body : { inviteId: string }
 */
export async function POST(req: Request) {
  if (!admin.apps.length) {
    return NextResponse.json({ ok: false, error: "Firebase Admin non configuré." }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const tokenStr = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!tokenStr) {
    return NextResponse.json({ ok: false, error: "Token manquant." }, { status: 401 });
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(tokenStr);
  } catch {
    return NextResponse.json({ ok: false, error: "Token invalide." }, { status: 401 });
  }

  const phoneFromAuth = decoded.phone_number;
  if (!phoneFromAuth) {
    return NextResponse.json({ ok: false, error: "Connexion téléphone requise pour accepter l’invitation." }, { status: 403 });
  }

  let inviteId = "";
  try {
    const body = (await req.json()) as { inviteId?: unknown };
    inviteId = typeof body.inviteId === "string" ? body.inviteId.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  if (!inviteId) {
    return NextResponse.json({ ok: false, error: "inviteId manquant." }, { status: 400 });
  }

  const db = admin.firestore();
  const inviteRef = db.collection("company_invites").doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    return NextResponse.json({ ok: false, error: "Invitation introuvable." }, { status: 404 });
  }

  const inv = inviteSnap.data() as {
    companyId?: string;
    phone?: string;
    role?: string;
  };

  const companyId = typeof inv.companyId === "string" ? inv.companyId.trim() : "";
  const invitePhone = typeof inv.phone === "string" ? inv.phone.trim() : "";
  if (!companyId || !invitePhone || inv.role !== "collaborateur") {
    return NextResponse.json({ ok: false, error: "Invitation invalide." }, { status: 400 });
  }

  if (!phonesMatch(phoneFromAuth, invitePhone)) {
    return NextResponse.json({ ok: false, error: "Ce numéro ne correspond pas à l’invitation." }, { status: 403 });
  }

  const uid = decoded.uid;

  const existing = await db.collection(`users/${uid}/company_memberships`).doc(companyId).get();
  if (existing.exists) {
    return NextResponse.json({ ok: true, alreadyMember: true, companyId });
  }

  const companySnap = await db.collection("companies").doc(companyId).get();
  const companyName =
    typeof companySnap.data()?.name === "string" ? (companySnap.data()?.name as string) : "Société";

  await db.doc(`users/${uid}/company_memberships/${companyId}`).set({
    role: "collaborateur",
    joinedAt: FieldValue.serverTimestamp(),
    companyName,
  });

  const snap = await db.collection(`users/${uid}/company_memberships`).get();
  const tenants = snap.docs.map((d) => {
    const role = (d.data().role as string) === "admin" ? "admin" : "collaborateur";
    return `${d.id}:${role}`;
  });
  const fallbackActive = tenants.some((t) => t.startsWith(`${companyId}:`)) ? companyId : snap.docs[0]?.id ?? companyId;

  await admin.auth().setCustomUserClaims(uid, {
    bmTenants: tenants,
    bmActive: fallbackActive || null,
  });

  return NextResponse.json({ ok: true, companyId });
}
