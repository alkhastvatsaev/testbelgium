import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAvailableSlots } from "../hooks/useAvailableSlots";
import { Loader2, Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, ChevronDown, CalendarPlus } from "lucide-react";
import { format, addDays, isSameDay, isBefore, startOfToday, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface SmartTimeSlotPickerProps {
  companyId: string | null | undefined;
  selectedDate: string; // YYYY-MM-DD
  selectedTime: string; // HH:mm
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
}

const WORKING_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

function PremiumCalendar({ selectedDate, onSelect }: { selectedDate: string, onSelect: (date: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate ? parse(selectedDate, "yyyy-MM-dd", new Date()) : startOfToday());
  const today = startOfToday();

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (!isBefore(endOfMonth(prev), startOfMonth(today))) {
      setCurrentMonth(prev);
    }
  };
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="w-full bg-white rounded-[24px] border border-black/[0.08] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button" 
          onClick={handlePrevMonth} 
          className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 rounded-full transition-colors active:scale-95 text-slate-600 disabled:opacity-30 disabled:pointer-events-none" 
          disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-[16px] font-bold text-slate-800 capitalize tracking-tight">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button 
          type="button" 
          onClick={handleNextMonth} 
          className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 rounded-full transition-colors active:scale-95 text-slate-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-[12px] font-bold text-slate-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-1">
        {days.map((day, i) => {
          const isSelected = selectedDate === format(day, dateFormat);
          const isPast = isBefore(day, today);
          const isCurrentMonth = isSameMonth(day, monthStart);
          
          return (
            <div key={i} className="flex items-center justify-center aspect-square">
              <button
                type="button"
                disabled={isPast}
                onClick={() => onSelect(format(day, dateFormat))}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-full text-[14px] font-bold transition-all",
                  !isCurrentMonth ? "text-slate-300" : isPast ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 active:scale-95",
                  isSelected && "bg-black text-white shadow-md hover:bg-slate-900",
                  isSameDay(day, today) && !isSelected && !isPast && "border-2 border-slate-200 text-slate-800"
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SmartTimeSlotPicker({
  companyId,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}: SmartTimeSlotPickerProps) {
  const { bookedSlotsByDate, loading } = useAvailableSlots(companyId);
  const [visibleSlotsCount, setVisibleSlotsCount] = useState(8);

  // Generate next available slots
  const nextAvailableSlots = useMemo(() => {
    const slots: { date: string; time: string; dateObj: Date; isToday: boolean; isTomorrow: boolean }[] = [];
    const now = new Date();
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      const dateStr = format(day, "yyyy-MM-dd");
      const isToday = isSameDay(day, now);
      const isTom = isSameDay(day, tomorrow);
      
      const bookedForDay = bookedSlotsByDate[dateStr] || [];

      for (const time of WORKING_HOURS) {
        let isPast = false;
        if (isToday) {
          const slotDate = parse(time, "HH:mm", new Date());
          if (isBefore(slotDate, now)) {
            isPast = true;
          }
        }

        const isBooked = bookedForDay.includes(time);

        if (!isPast && !isBooked) {
          slots.push({
            date: dateStr,
            time,
            dateObj: day,
            isToday,
            isTomorrow: isTom
          });
        }
      }
    }
    
    return slots; // Show all available slots
  }, [bookedSlotsByDate]);

  // Handle specific date availability
  const specificDateSlots = useMemo(() => {
    if (!selectedDate) return [];

    const now = new Date();
    const isToday = selectedDate === format(now, "yyyy-MM-dd");
    const bookedForDay = bookedSlotsByDate[selectedDate] || [];

    return WORKING_HOURS.map((time) => {
      let isPast = false;
      if (isToday) {
        const slotDate = parse(time, "HH:mm", new Date());
        if (isBefore(slotDate, now)) {
          isPast = true;
        }
      }
      const isBooked = bookedForDay.includes(time);

      return {
        time,
        disabled: isPast || isBooked,
      };
    });
  }, [selectedDate, bookedSlotsByDate]);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 1. Prochaines disponibilités */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Prochaines disponibilités
          </label>
          {loading && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              Recherche...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!loading && nextAvailableSlots.length === 0 ? (
            <div className="text-amber-600 font-medium bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-center">
              Aucune disponibilité trouvée pour les prochains jours.
            </div>
          ) : (
            <>
              {nextAvailableSlots.slice(0, visibleSlotsCount).map((slot) => {
                const isSelected = selectedDate === slot.date && selectedTime === slot.time;
                
                let dateLabel = format(slot.dateObj, "EEEE d MMMM", { locale: fr });
                if (slot.isToday) dateLabel = "Aujourd'hui";
                else if (slot.isTomorrow) dateLabel = "Demain";

                // Capitalize first letter
                dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

                return (
                  <button
                    key={`${slot.date}-${slot.time}`}
                    type="button"
                    onClick={() => {
                      onDateSelect(slot.date);
                      onTimeSelect(slot.time);
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-black bg-black text-white shadow-md"
                        : "border-black/[0.08] bg-white hover:border-black/[0.2] hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className={cn("text-[13px] font-medium", isSelected ? "text-white/80" : "text-slate-500")}>
                        {dateLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 opacity-70" />
                        <span className="text-lg font-bold">{slot.time}</span>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </button>
                );
              })}
              
              {visibleSlotsCount < nextAvailableSlots.length && (
                <button
                  type="button"
                  onClick={() => setVisibleSlotsCount((prev) => prev + 8)}
                  className="flex items-center justify-center gap-1.5 py-3 mt-1 text-[14px] font-bold text-slate-500 hover:text-slate-800 transition-colors rounded-xl hover:bg-slate-50"
                >
                  Afficher plus d'horaires
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#FAFAFA] px-3 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
            Ou
          </span>
        </div>
      </div>

      {/* 2. Choisir une date spécifique */}
      <div className="flex flex-col gap-4 pb-8">
        <label className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          Programmer plus tard
        </label>
        
        <div className="flex flex-col gap-4">
          <PremiumCalendar 
            selectedDate={selectedDate} 
            onSelect={(date) => {
              onDateSelect(date);
              onTimeSelect(""); // reset time when date changes
            }} 
          />

          {selectedDate && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-[13px] font-bold text-slate-500">
                Disponibilités le {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "d MMMM", { locale: fr })}
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {specificDateSlots.filter(s => !s.disabled).map(({ time }) => {
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onTimeSelect(time)}
                      className={cn(
                        "flex items-center justify-center rounded-[12px] border py-3 text-sm font-bold transition-all",
                        isSelected
                          ? "border-black bg-black text-white shadow-md"
                          : "border-black/[0.08] bg-white text-slate-700 hover:border-black/[0.2] hover:bg-slate-50 active:scale-95"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              {specificDateSlots.filter(s => !s.disabled).length === 0 && (
                <div className="text-amber-600 font-medium bg-amber-50 p-4 rounded-xl text-[13px] border border-amber-100 text-center">
                  L'artisan n'a aucune disponibilité pour cette date.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

