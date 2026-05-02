import { useState, useEffect } from 'react';
import { firestore, auth, isConfigured } from '@/core/config/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Intervention } from './types';

const MOCK_INTERVENTIONS: Intervention[] = [
  { id: '1', title: 'Porte claquée', address: 'Mont des Arts, Bruxelles', time: 'Maintenant', status: 'in_progress', location: { lat: 50.84655, lng: 4.35415 } },
  { id: '2', title: 'Changement de cylindre', address: 'Grand Place, Bruxelles', time: '14:30', status: 'pending', location: { lat: 50.8468, lng: 4.3528 } },
  { id: '3', title: 'Ouverture de coffre-fort', address: 'Avenue Louise, Bruxelles', time: '11:00', status: 'done', location: { lat: 50.84, lng: 4.36 } }
];

export function useInterventions() {
  const [interventions, setInterventions] = useState<Intervention[]>(MOCK_INTERVENTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !firestore || !auth) {
      setLoading(false);
      return;
    }

    let unsubscribeSnapshot: () => void;

    import('firebase/auth').then(({ onAuthStateChanged }) => {
      if (!auth) return;
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          if (!firestore) return;
          const intRef = collection(firestore, 'interventions');
          unsubscribeSnapshot = onSnapshot(intRef, (snapshot) => {
            if (!snapshot.empty) {
              const parsed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
              setInterventions(parsed);
            } else {
              // Seed mock data
              MOCK_INTERVENTIONS.forEach(async (i) => {
                await setDoc(doc(intRef, i.id), i);
              });
            }
            setLoading(false);
          }, (error) => {
            console.error("Erreur lecture interventions Firestore (Offline mode actif ?):", error);
            setLoading(false);
          });
        } else {
          setLoading(false);
          if (unsubscribeSnapshot) unsubscribeSnapshot();
        }
      });
      return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      };
    });
  }, []);

  return { interventions, loading };
}
