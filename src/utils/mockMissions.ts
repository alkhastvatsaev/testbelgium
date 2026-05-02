export interface Mission {
  id: number;
  clientName: string;
  coordinates: [number, number];
  time: string;
  status: string;
  source?: 'mock' | 'live';
  /** YYYY-MM-DD (utilisé pour filtrer les missions créées) */
  date?: string;
  /** Clé stable pour dédoublonnage (ex: nom fichier audio) */
  key?: string;
}

// Simple seeded pseudo-random number generator
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Convert a date string (YYYY-MM-DD) into a stable numeric seed
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

const FIRST_NAMES = ["M.", "Mme", "Dr."];
const LAST_NAMES = [
  "Dubois", "Peeters", "Janssens", "Maes", "Mertens", "Willems", "Lambert", "Dupont", 
  "Claes", "Goossens", "Wouters", "De Smet", "Jacobs", "Vandenberghe", "Desmedt"
];
const STATUSES = ["Terminé", "En cours", "À venir"];

export function generateDailyMissions(date: Date): Mission[] {
  // Use local date string YYYY-MM-DD for stable generation
  const dateStr = date.toLocaleDateString('en-CA'); 
  const seed = hashString(dateStr);
  const random = mulberry32(seed);

  // Generate between 4 and 12 missions
  const numMissions = Math.floor(random() * 9) + 4;
  
  const missions: Mission[] = [];
  
  for (let i = 0; i < numMissions; i++) {
    const title = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    
    // Random coordinate around Brussels center (4.3522, 50.8466)
    // Add small random offset between -0.05 and +0.05
    const lng = 4.3522 + (random() * 0.1 - 0.05);
    const lat = 50.8466 + (random() * 0.1 - 0.05);
    
    // Random time between 08:00 and 20:00
    const hour = Math.floor(random() * 13) + 8;
    const min = Math.floor(random() * 4) * 15; // 0, 15, 30, 45
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    // Sort by time later, so assign status roughly based on time relative to "now"
    // For simplicity in the mock, we'll assign status dynamically below if it's "today"
    // But for past/future, past=Terminé, future=À venir.
    
    const today = new Date().toLocaleDateString('en-CA');
    let status = "À venir";
    
    if (dateStr < today) {
      status = "Terminé";
    } else if (dateStr > today) {
      status = "À venir";
    } else {
      // It's today, distribute based on hour
      const currentHour = new Date().getHours();
      if (hour < currentHour) {
        status = "Terminé";
      } else if (hour === currentHour) {
        status = "En cours";
      } else {
        status = "À venir";
      }
    }

    missions.push({
      id: parseInt(dateStr.replace(/-/g, '') + i.toString()),
      clientName: `${title} ${lastName}`,
      coordinates: [lng, lat],
      time: timeStr,
      status: status
    });
  }
  
  // Sort missions chronologically
  return missions.sort((a, b) => a.time.localeCompare(b.time));
}
