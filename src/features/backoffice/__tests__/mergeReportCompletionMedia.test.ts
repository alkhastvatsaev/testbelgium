import type { BridgedTechnicianReport } from "@/context/TechnicianBackofficeReportBridgeContext";
import {
  mergeReportCompletionMedia,
  pickLatestBridgedReportForIntervention,
  shouldDismissBridgedTerrainReport,
} from "@/features/backoffice/mergeReportCompletionMedia";

const bridged = (partial: Partial<BridgedTechnicianReport> & Pick<BridgedTechnicianReport, "localId" | "interventionId">): BridgedTechnicianReport => ({
  photoDataUrls: [],
  signaturePngDataUrl: "",
  receivedAt: 0,
  ...partial,
});

describe("mergeReportCompletionMedia", () => {
  it("prefers Firestore completion URLs when present", () => {
    const out = mergeReportCompletionMedia(
      {
        completionPhotoUrls: ["https://x/1.jpg"],
        completionSignatureUrl: "https://x/sig.png",
      },
      bridged({
        localId: "a",
        interventionId: "iv1",
        photoDataUrls: ["data:image/jpeg;base64,AAA"],
        signaturePngDataUrl: "data:image/png;base64,BBB",
        receivedAt: 1,
      }),
    );
    expect(out.photoUrls).toEqual(["https://x/1.jpg"]);
    expect(out.signatureUrl).toBe("https://x/sig.png");
  });

  it("falls back to bridged data URLs when Firestore has no completion media", () => {
    const out = mergeReportCompletionMedia(
      { completionPhotoUrls: [], completionSignatureUrl: null },
      bridged({
        localId: "a",
        interventionId: "iv1",
        photoDataUrls: ["data:image/jpeg;base64,AAA"],
        signaturePngDataUrl: "data:image/png;base64,BBB",
        receivedAt: 1,
      }),
    );
    expect(out.photoUrls).toEqual(["data:image/jpeg;base64,AAA"]);
    expect(out.signatureUrl).toBe("data:image/png;base64,BBB");
  });

  it("picks the latest bridged report by receivedAt", () => {
    const older = bridged({
      localId: "old",
      interventionId: "iv1",
      photoDataUrls: ["old"],
      signaturePngDataUrl: "sig-old",
      receivedAt: 100,
    });
    const newer = bridged({
      localId: "new",
      interventionId: "iv1",
      photoDataUrls: ["new"],
      signaturePngDataUrl: "sig-new",
      receivedAt: 200,
    });
    expect(pickLatestBridgedReportForIntervention([older, newer], "iv1")).toEqual(newer);
  });
});

describe("shouldDismissBridgedTerrainReport", () => {
  it("dismisses when invoiced", () => {
    expect(
      shouldDismissBridgedTerrainReport({
        status: "invoiced",
        completionPhotoUrls: [],
        completionSignatureUrl: null,
      }),
    ).toBe(true);
  });

  it("does not dismiss done without server completion media", () => {
    expect(
      shouldDismissBridgedTerrainReport({
        status: "done",
        completionPhotoUrls: [],
        completionSignatureUrl: null,
      }),
    ).toBe(false);
  });

  it("dismisses done when server has photos and signature", () => {
    expect(
      shouldDismissBridgedTerrainReport({
        status: "done",
        completionPhotoUrls: ["https://x/1.jpg"],
        completionSignatureUrl: "https://x/s.png",
      }),
    ).toBe(true);
  });
});
