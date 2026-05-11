"use client";

import { useDashboardSelectedDate } from "@/context/DateContext";

/**
 * Jour calendaire des missions hub technicien : même date que le sélecteur du tableau de bord
 * (ClockCalendar en haut à gauche).
 */
export function useTechnicianMissionDayAnchor(): Date {
  return useDashboardSelectedDate();
}
