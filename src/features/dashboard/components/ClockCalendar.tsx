"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDateContext } from '@/context/DateContext';
import { useTranslation } from "@/core/i18n/I18nContext";

export default function ClockCalendar() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const { selectedDate, setSelectedDate } = useDateContext();
  const { language, t } = useTranslation();

  const locale = language === "nl" ? "nl-NL" : language === "en" ? "en-GB" : "fr-FR";

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    setCalendarDate(selectedDate);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  const timeString =
    time?.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '';
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const dateString = selectedDate.toLocaleDateString(locale, dateOptions).replace(/\./g, '') || '';

  // Render Calendar Grid
  const renderCalendarDays = () => {
    if (!calendarDate) return [];
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < startDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      
      let className = "calendar-day";
      if (isSelected) className += " selected bg-blue-500 text-white rounded-md font-bold";
      else if (isToday) className += " today";

      days.push(
        <div 
          key={`day-${i}`} 
          className={className}
          data-testid={`calendar-day-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            const newDate = new Date(year, month, i);
            setSelectedDate(newDate);
            setIsCalendarOpen(false);
          }}
          style={{ cursor: 'pointer' }}
        >
          {i}
        </div>
      );
    }
    return days;
  };

  const changeMonth = (delta: number) => {
    if (!calendarDate) return;
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + delta, 1));
  };

  const changeDay = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + delta);
    setSelectedDate(newDate);
    setCalendarDate(newDate);
  };

  return (
    <>
      <div 
        id="calendar-overlay" 
        className={isCalendarOpen ? 'active' : ''} 
        onClick={() => setIsCalendarOpen(false)}
      />
      
      <div 
        id="dynamic-widget" 
        data-testid="clock-calendar-widget"
        className={isCalendarOpen ? 'state-calendar' : 'state-clock'}
        onClick={() => {
          if (!isCalendarOpen) {
            setCalendarDate(selectedDate);
            setIsCalendarOpen(true);
          }
        }}
      >
        <div id="clock-content" className="flex items-center justify-between w-full px-2">
          {!isCalendarOpen && (
            <button 
              data-testid="prev-day-btn"
              onClick={(e) => changeDay(e, -1)} 
              className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex flex-row items-center gap-4 flex-1 justify-center min-w-0">
            <div id="date-display" data-testid="date-display" className="whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-wider">{dateString}</div>
            <div className="w-px h-4 bg-slate-300 flex-shrink-0" />
            <div id="time-display" data-testid="time-display" className="whitespace-nowrap tabular-nums">{timeString}</div>
          </div>

          {!isCalendarOpen && (
            <button 
              data-testid="next-day-btn"
              onClick={(e) => changeDay(e, 1)} 
              className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 flex-shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <div id="calendar-content">
          <div className="calendar-header">
            <button data-testid="prev-month-btn" onClick={(e) => { e.stopPropagation(); changeMonth(-1); }}><ChevronLeft className="w-5 h-5" /></button>
            <div id="calendar-month-year">
              {calendarDate ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarDate) : ''}
            </div>
            <button data-testid="next-month-btn" onClick={(e) => { e.stopPropagation(); changeMonth(1); }}><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="calendar-grid">
            {(() => {
              const v = t("calendar.weekdays_initials");
              const arr = Array.isArray(v) ? v : null;
              const fallback = ["M", "T", "W", "T", "F", "S", "S"];
              const days = arr && arr.length === 7 ? arr : fallback;
              return days.map((d, i) => (
                <div key={i} className="calendar-day-name">{String(d)}</div>
              ));
            })()}
          </div>
          <div className="calendar-grid" id="calendar-days">
            {renderCalendarDays()}
          </div>
        </div>
      </div>
    </>
  );
}
