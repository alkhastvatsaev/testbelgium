import { BACKOFFICE_HUB_PAGE_INDEX } from "@/features/backoffice/backofficeConstants";

/** Doublons vit dans le hub back-office (panneau gauche). */
export const DUPLICATE_ALERTS_SLOT_INDEX = BACKOFFICE_HUB_PAGE_INDEX;

/** Fenêtre glissante pour comparer les demandes (ms). */
export const DUPLICATE_DETECTION_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Seuil Jaccard sur tokens (problème / description). */
export const DUPLICATE_PROBLEM_SIMILARITY_MIN = 0.38;
