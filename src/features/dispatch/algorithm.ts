import { Technician } from '@/features/technicians/types';


function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}


export async function findBestTechnician(
  technicians: Technician[], 
  interventionLat: number, 
  interventionLng: number
): Promise<Technician | null> {
  

  const availableTechs = technicians.filter(t => t.status === 'available');
  
  if (availableTechs.length === 0) return null;


  const sortedByHaversine = availableTechs.sort((a, b) => {
    return calculateDistance(interventionLat, interventionLng, a.location.lat, a.location.lng) 
         - calculateDistance(interventionLat, interventionLng, b.location.lat, b.location.lng);
  });

  const top3 = sortedByHaversine.slice(0, 3);


  let bestTech: Technician | null = null;
  let minDuration = Infinity;

  for (const tech of top3) {
    try {
      const response = await fetch('/api/maps/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: tech.location.lat,
          originLng: tech.location.lng,
          destLat: interventionLat,
          destLng: interventionLng
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.durationSeconds < minDuration) {
        minDuration = data.durationSeconds;
        bestTech = { ...tech, realEta: data.durationText }; // Ajoute l'ETA réel
      }
    } catch(e) {
      console.error("Erreur Google Maps pour le tech", tech.name, e);
    }
  }


  return bestTech || top3[0];
}
