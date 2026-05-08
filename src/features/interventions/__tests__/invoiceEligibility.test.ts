import {
  hasDownloadableInvoice,
  isAwaitingAutoInvoice,
  isInvoiceChecklistComplete,
} from "@/features/interventions/invoiceEligibility";

describe("invoiceEligibility", () => {
  it("isInvoiceChecklistComplete exige au moins une photo et une signature URL", () => {
    expect(isInvoiceChecklistComplete(null)).toBe(false);
    expect(isInvoiceChecklistComplete({ completionPhotoUrls: [], completionSignatureUrl: "https://x" })).toBe(false);
    expect(
      isInvoiceChecklistComplete({ completionPhotoUrls: ["https://a"], completionSignatureUrl: "" }),
    ).toBe(false);
    expect(
      isInvoiceChecklistComplete({ completionPhotoUrls: ["https://a"], completionSignatureUrl: "https://s" }),
    ).toBe(true);
  });

  it("isAwaitingAutoInvoice = done + checklist + pas d’URL", () => {
    expect(
      isAwaitingAutoInvoice({
        status: "done",
        completionPhotoUrls: ["x"],
        completionSignatureUrl: "y",
      }),
    ).toBe(true);
    expect(
      isAwaitingAutoInvoice({
        status: "done",
        completionPhotoUrls: ["x"],
        completionSignatureUrl: "y",
        invoicePdfUrl: "https://pdf",
      }),
    ).toBe(false);
  });

  it("hasDownloadableInvoice = invoiced + URL", () => {
    expect(hasDownloadableInvoice({ status: "invoiced", invoicePdfUrl: "https://f" })).toBe(true);
    expect(hasDownloadableInvoice({ status: "done", invoicePdfUrl: "https://f" })).toBe(false);
  });
});
