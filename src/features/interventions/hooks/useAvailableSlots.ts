import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { format, addDays } from "date-fns";

export function useAvailableSlots(companyId: string | null | undefined, date: string | null = null) {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSlots() {
      if (!companyId || !firestore) {
        if (isMounted) setBookedSlotsByDate({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const q = query(
          collection(firestore, "interventions"),
          where("companyId", "==", companyId),
          where("requestedDate", ">=", todayStr)
        );

        const snapshot = await getDocs(q);
        const booked: Record<string, string[]> = {};

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status !== "cancelled" && data.requestedDate && data.requestedTime) {
            if (!booked[data.requestedDate]) {
              booked[data.requestedDate] = [];
            }
            booked[data.requestedDate].push(data.requestedTime);
          }
        });

        if (isMounted) {
          setBookedSlotsByDate(booked);
        }
      } catch (err: any) {
        console.error("Error fetching available slots:", err);
        if (isMounted) {
          setError(err.message || "Failed to fetch slots");
          setBookedSlotsByDate({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const bookedSlots = date ? (bookedSlotsByDate[date] || []) : [];

  return { bookedSlots, bookedSlotsByDate, loading, error };
}
