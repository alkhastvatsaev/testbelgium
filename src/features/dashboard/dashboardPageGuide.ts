import { COMPANY_HUB_RAIL_DEMANDE_LABEL } from "@/features/company/companyHubConstants";

/** Libellés pour les pages du carrousel (index 0 = carte, 1–3 = hubs société / technicien / back-office). */
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
  {
    title: "Back-office",
    hint: "Même gabarit que les autres hubs : en-tête icône + titre court, cartes arrondies 18–22px, ombre légère, peu de shadcn Card.",
  },
];

export function getDashboardPageGuide(pageIndex: number): DashboardPageMeta | null {
  if (pageIndex < 0 || pageIndex >= DASHBOARD_PAGE_GUIDE.length) return null;
  return DASHBOARD_PAGE_GUIDE[pageIndex] ?? null;
}
