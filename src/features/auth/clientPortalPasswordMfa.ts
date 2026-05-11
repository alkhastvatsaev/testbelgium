import type { Auth, MultiFactorResolver } from "firebase/auth";
import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";

const PHONE_FACTOR = "phone";
const TOTP_FACTOR = "totp";

export type MfaHintKind = "phone" | "totp" | "unknown";

export function mfaHintKind(hint: { factorId: string }): MfaHintKind {
  const fid = hint.factorId;
  const totpId = TotpMultiFactorGenerator.FACTOR_ID ?? TOTP_FACTOR;
  const phoneId = PhoneMultiFactorGenerator.FACTOR_ID ?? PHONE_FACTOR;
  if (fid === totpId || fid === TOTP_FACTOR) return "totp";
  if (fid === phoneId || fid === PHONE_FACTOR) return "phone";
  return "unknown";
}

/** Préfère TOTP puis téléphone. */
export function pickDefaultMfaHintIndex(resolver: MultiFactorResolver): number {
  const hints = resolver.hints;
  const totpIdx = hints.findIndex((h) => mfaHintKind(h) === "totp");
  if (totpIdx >= 0) return totpIdx;
  const phoneIdx = hints.findIndex((h) => mfaHintKind(h) === "phone");
  if (phoneIdx >= 0) return phoneIdx;
  return 0;
}

export async function sendPhoneMfaSms(
  auth: Auth,
  resolver: MultiFactorResolver,
  hintIndex: number,
  appVerifier: RecaptchaVerifier,
): Promise<string> {
  const hint = resolver.hints[hintIndex];
  if (!hint || mfaHintKind(hint) !== "phone") {
    throw new Error("Aucun second facteur SMS disponible pour ce compte.");
  }
  const provider = new PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber({ multiFactorHint: hint, session: resolver.session }, appVerifier);
}

export async function completePhoneMfa(
  resolver: MultiFactorResolver,
  verificationId: string,
  smsCode: string,
): Promise<void> {
  const cred = PhoneAuthProvider.credential(verificationId, smsCode.trim());
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await resolver.resolveSignIn(assertion);
}

/** @param enrollmentId — `MultiFactorInfo.uid` du hint TOTP */
export async function completeTotpMfa(
  resolver: MultiFactorResolver,
  enrollmentId: string,
  code: string,
): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(enrollmentId, code.trim());
  await resolver.resolveSignIn(assertion);
}

export function createInvisibleRecaptcha(auth: Auth, containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}
