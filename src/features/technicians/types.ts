export interface Technician {
  id: string;
  name: string;
  initial: string;
  vehicle: string;
  status: 'available' | 'en_route' | 'on_site';
  location: {
    lat: number;
    lng: number;
  };
  realEta?: string;
}
