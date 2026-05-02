import { useState, useEffect } from 'react';
import { firestore, auth, isConfigured } from '@/core/config/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Technician } from './types';

const MOCK_TECHNICIANS: Technician[] = [
  { id: '1', name: 'Alexandre V.', initial: 'A', vehicle: 'Camionnette #01', status: 'on_site', location: { lat: 50.84655, lng: 4.35415 } },
  { id: '2', name: 'Thomas L.', initial: 'T', vehicle: 'Camionnette #03', status: 'available', location: { lat: 50.84800, lng: 4.35200 } },
  { id: '3', name: 'Boris K.', initial: 'B', vehicle: 'Camionnette #02', status: 'en_route', location: { lat: 50.84400, lng: 4.35000 } }
];

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>(MOCK_TECHNICIANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si Firebase n'est pas configuré, on utilise le mode simulation
    if (!isConfigured || !firestore || !auth) {
      setLoading(false);
      const interval = setInterval(() => {
        setTechnicians(prev => prev.map(t => {
          if (t.status === 'en_route') {
            return {
              ...t,
              location: {
                lat: t.location.lat + (Math.random() - 0.2) * 0.0002,
                lng: t.location.lng + (Math.random() - 0.2) * 0.0002
              }
            };
          }
          return t;
        }));
      }, 2000);
      return () => clearInterval(interval);
    }

    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeSnapshot: (() => void) | undefined;
    let active = true;

    const setupAuth = async () => {
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        if (!active) return;

        // auth! est sûr car on a vérifié au début du useEffect
        unsubscribeAuth = onAuthStateChanged(auth!, (user) => {
          if (!active) return;

          if (user) {
            // firestore! est sûr car on a vérifié au début du useEffect
            const techRef = collection(firestore!, 'technicians');
            
            // Nettoyer l'ancien snapshot si l'utilisateur change mais reste connecté
            if (unsubscribeSnapshot) unsubscribeSnapshot();

            unsubscribeSnapshot = onSnapshot(techRef, (snapshot) => {
              if (!active) return;

              if (!snapshot.empty) {
                const parsed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
                setTechnicians(parsed);
              } else {
                // Initialiser avec les mocks si la collection est vide
                MOCK_TECHNICIANS.forEach(async (t) => {
                  await setDoc(doc(techRef, t.id), t);
                });
              }
              setLoading(false);
            }, (error) => {
              console.error("Erreur lecture techniciens Firestore:", error);
              if (active) setLoading(false);
            });
          } else {
            if (active) {
              setLoading(false);
              if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = undefined;
              }
            }
          }
        });
      } catch (error) {
        console.error("Erreur initialisation Auth:", error);
        if (active) setLoading(false);
      }
    };

    setupAuth();

    return () => {
      active = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return { technicians, loading };
}
