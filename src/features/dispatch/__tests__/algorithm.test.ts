import { findBestTechnician } from '../algorithm';
import { Technician } from '@/features/technicians/types';

describe('Dispatch Algorithm (Haversine)', () => {
  const mockTechnicians: Technician[] = [
    {
      id: '1',
      name: 'Tech 1',
      initial: 'T1',
      vehicle: 'V1',
      status: 'available',
      location: { lat: 50.84655, lng: 4.35415 } // Bruxelles Centre
    },
    {
      id: '2',
      name: 'Tech 2',
      initial: 'T2',
      vehicle: 'V2',
      status: 'en_route',
      location: { lat: 50.85000, lng: 4.35000 } // Très proche, mais en route
    },
    {
      id: '3',
      name: 'Tech 3',
      initial: 'T3',
      vehicle: 'V3',
      status: 'available',
      location: { lat: 50.90000, lng: 4.40000 } // Loin (Nord de Bruxelles)
    }
  ];

  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, durationSeconds: 600, durationText: '10 min' }),
      })
    ) as jest.Mock;
  });

  it('should return null if no technicians are available', async () => {
    const busyTechs: Technician[] = [
      { ...mockTechnicians[0], status: 'on_site' },
      { ...mockTechnicians[1], status: 'en_route' }
    ];
    
    const best = await findBestTechnician(busyTechs, 50.8468, 4.3528);
    expect(best).toBeNull();
  });

  it('should find the closest available technician', async () => {
    const interventionLat = 50.8468;
    const interventionLng = 4.3528;

    const best = await findBestTechnician(mockTechnicians, interventionLat, interventionLng);
    
    expect(best).not.toBeNull();
    expect(best?.id).toBe('1');
  });

  it('should find Tech 3 if Tech 1 is not available', async () => {
    const modifiedTechs: Technician[] = [
      { ...mockTechnicians[0], status: 'on_site' },
      mockTechnicians[1],
      mockTechnicians[2] 
    ];

    const interventionLat = 50.8468;
    const interventionLng = 4.3528;

    const best = await findBestTechnician(modifiedTechs, interventionLat, interventionLng);
    
    expect(best).not.toBeNull();
    // Tech 1 et 2 sont occupés, Tech 3 est le seul dispo même si plus loin
    expect(best?.id).toBe('3');
  });
});
