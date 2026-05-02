import path from "path";
import {
  interventionJsonAbsPath,
  isSafeUploadsRelativePath,
  publicUrlUnderUploads,
} from "../intervention-json-path";

describe("intervention-json-path", () => {
  const uploadsRoot = path.join("/app", "public", "uploads");

  it("isSafeUploadsRelativePath rejette .. et segments vides", () => {
    expect(isSafeUploadsRelativePath("M_X/a.m4a")).toBe(true);
    expect(isSafeUploadsRelativePath("../evil.m4a")).toBe(false);
    expect(isSafeUploadsRelativePath("a/../b.m4a")).toBe(false);
  });

  it("interventionJsonAbsPath place le json à côté de l’audio (sous-dossier)", () => {
    expect(interventionJsonAbsPath(uploadsRoot, "M_DUPONT/call-1.m4a")).toBe(
      path.join(uploadsRoot, "M_DUPONT", "call-1.intervention.json"),
    );
  });

  it("interventionJsonAbsPath racine", () => {
    expect(interventionJsonAbsPath(uploadsRoot, "call-1.m4a")).toBe(path.join(uploadsRoot, "call-1.intervention.json"));
  });

  it("publicUrlUnderUploads", () => {
    const abs = path.join(uploadsRoot, "M_DUPONT", "x.intervention.json");
    expect(publicUrlUnderUploads(uploadsRoot, abs)).toBe("/uploads/M_DUPONT/x.intervention.json");
  });
});
