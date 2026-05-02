"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const profiles = [
  { name: "ASLAMBECK", role: "ADMIN" },
  { name: "TIMOUR", role: "ADMIN" }
];

export default function UserProfile() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentProfile = profiles[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + profiles.length) % profiles.length);
  };

  return (
    <div 
      className="fixed z-50 flex items-center justify-center cursor-pointer group hover:bg-white/80 hover:scale-[1.01] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] active:scale-[0.99] transition-all duration-300 ease-out"
      style={{ 
        top: '24px',
        right: '48px',
        width: 'calc(50vw - 35vh - 100px + 5mm)',
        height: '70px',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="flex items-center justify-between w-full px-4">
        <button 
          onClick={handlePrev}
          data-testid="prev-profile-btn"
          className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-4 flex-1">
          <span data-testid="profile-name" className="text-[20px] font-semibold text-slate-800 tracking-wide whitespace-nowrap">
            {currentProfile.name}
          </span>
          <span data-testid="profile-role" className="px-2 py-1 rounded-md bg-[#E5F1FF] text-[#007AFF] text-[10px] font-extrabold uppercase tracking-widest border border-[#CCE3FF] shadow-sm whitespace-nowrap">
            {currentProfile.role}
          </span>
        </div>

        <button 
          onClick={handleNext}
          data-testid="next-profile-btn"
          className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700 flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

