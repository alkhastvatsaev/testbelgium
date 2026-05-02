export interface Intervention {
  id: string;
  title: string;
  address: string;
  time: string;
  status: 'pending' | 'in_progress' | 'done' | 'pending_needs_address';
  location: {
    lat: number;
    lng: number;
  };
  phone?: string | null;
  clientName?: string | null;
  urgency?: boolean;
  category?: 'serrurerie' | 'autre';
  problem?: string | null;
  date?: string | null;
  hour?: string | null;
  transcription?: string;
  audioUrl?: string;
  createdAt?: string;
}
