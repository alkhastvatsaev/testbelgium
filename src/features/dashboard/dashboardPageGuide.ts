import { COMPANY_HUB_RAIL_DEMANDE_LABEL } from "@/features/company/companyHubConstants";

/** Libellés pour les pages du carrousel (index 0 = carte, 1–2 = hubs société / technicien). */
export type DashboardPageMeta = {
  title: string;
  hint: string;
};

export const DASHBOARD_PAGE_GUIDE: DashboardPageMeta[] = [
  { title: "Carte", hint: "Galaxy, audio, recherche — vue opérationnelle principale." },
  {
    title: "Espace société",
    hint: `Triptyque : ${COMPANY_HUB_RAIL_DEMANDE_LABEL} (gauche) · organisation & invitations (centre) · portail client (droite).`,
  },
  {
    title: "Technicien",
    hint: "Triptyque : espace libre (gauche) · missions (centre) · hors-ligne, clôture, push, facturation auto (droite).",
  },
];

export function getDashboardPageGuide(pageIndex: number): DashboardPageMeta | null {
  if (pageIndex < 0 || pageIndex >= DASHBOARD_PAGE_GUIDE.length) return null;
  return DASHBOARD_PAGE_GUIDE[pageIndex] ?? null;
}
