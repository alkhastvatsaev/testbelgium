import { pickDefaultMfaHintIndex } from "../clientPortalPasswordMfa";
import type { MultiFactorResolver } from "firebase/auth";

describe("clientPortalPasswordMfa", () => {
  it("pickDefaultMfaHintIndex choisit totp avant téléphone", () => {
    const resolver = {
      hints: [
        { factorId: "phone", uid: "p1", enrollmentTime: "" },
        { factorId: "totp", uid: "t1", enrollmentTime: "" },
      ],
      session: {},
    } as unknown as MultiFactorResolver;
    expect(pickDefaultMfaHintIndex(resolver)).toBe(1);
  });

  it("pickDefaultMfaHintIndex retombe sur le téléphone si pas de totp", () => {
    const resolver = {
      hints: [{ factorId: "phone", uid: "p1", enrollmentTime: "" }],
      session: {},
    } as unknown as MultiFactorResolver;
    expect(pickDefaultMfaHintIndex(resolver)).toBe(0);
  });
});
