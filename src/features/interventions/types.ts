export interface Intervention {
  id: string;
  title: string;
  address: string;
  time: string;
  status: 'pending' | 'en_route' | 'in_progress' | 'done' | 'pending_needs_address' | 'invoiced';
  location: {
    lat: number;
    lng: number;
  };
  phone?: string | null;
  clientName?: string | null;
  /** Demande société (wizard) — contact séparé. */
  clientFirstName?: string | null;
  clientLastName?: string | null;
  clientPhone?: string | null;
  urgency?: boolean;
  category?: 'serrurerie' | 'autre';
  problem?: string | null;
  date?: string | null;
  hour?: string | null;
  transcription?: string;
  audioUrl?: string;
  createdAt?: string;
  /** Multi-tenant : isolation par société (voir Firestore rules). */
  companyId?: string | null;
  /** Créateur de la demande (Firebase Auth uid). */
  createdByUid?: string | null;
  /** Technicien désigné — filtre sécurité + dashboard Prompt 4. */
  assignedTechnicianUid?: string | null;
  /** Planification optionnelle (AAAA-MM-JJ + HH:mm), sinon repli sur createdAt. */
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  /** Miniatures JPEG compressées (data URLs), usage interne / prévisualisation. */
  attachmentThumbnails?: string[];
  /** Fin d’intervention — URLs Storage (JPEG). */
  completionPhotoUrls?: string[];
  completionSignatureUrl?: string | null;
  /** URL HTTPS Firebase Storage (PDF), renseignée par Cloud Function après facturation auto. */
  invoicePdfUrl?: string | null;
  /** Chemin objet Storage relatif au bucket (ex. invoices/{id}.pdf). */
  invoicePdfStoragePath?: string | null;
  invoicedAt?: unknown;
  completedAt?: unknown;
  completedByUid?: string | null;
}
