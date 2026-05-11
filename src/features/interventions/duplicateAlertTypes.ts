export type DuplicateAlertStatus = "open" | "ignored" | "merged";

export type DuplicateAlertDoc = {
  companyId: string;
  newInterventionId: string;
  similarInterventionId: string;
  similarAddress: string;
  similarProblemPreview: string;
  similarCreatedAt: string;
  status: DuplicateAlertStatus;
  createdByUid: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedByUid?: string;
};

export type DuplicateAlertRow = DuplicateAlertDoc & { id: string };
