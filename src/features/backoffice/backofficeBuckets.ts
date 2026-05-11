import type { Intervention } from "@/features/interventions/types";


export type BackofficeBucket = "pending" | "in_progress" | "done" | "invoiced";

export function interventionBackofficeBucket(status: Intervention["status"]): BackofficeBucket {
  if (status === "pending" || status === "pending_needs_address") return "pending";
  if (status === "in_progress") return "in_progress";
  if (status === "done") return "done";
  return "invoiced";
}

export function backofficeBucketLabel(bucket: BackofficeBucket): string {
  switch (bucket) {
    case "pending":
      return "En attente";
    case "in_progress":
      return "En cours";
    case "done":
      return "Terminé";
    case "invoiced":
      return "Facturé";
    default:
      return bucket;
  }
}


export function backofficeRowStatusLabel(status: Intervention["status"]): string {
  if (status === "pending_needs_address") return "En attente · à compléter";
  return backofficeBucketLabel(interventionBackofficeBucket(status));
}

export function interventionMatchesStatusBucket(iv: Intervention, bucket: BackofficeBucket): boolean {
  return interventionBackofficeBucket(iv.status) === bucket;
}
