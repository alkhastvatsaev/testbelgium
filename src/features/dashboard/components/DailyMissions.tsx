"use client";
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDateContext } from '@/context/DateContext';
import { generateDailyMissions, type Mission } from '@/utils/mockMissions';

export default function DailyMissions({ missions: missionsProp, onMissionClick }: { missions?: Mission[]; onMissionClick?: (mission: any) => void }) {
  const { selectedDate } = useDateContext();
  const missions = useMemo(() => missionsProp ?? generateDailyMissions(selectedDate), [missionsProp, selectedDate]);

  return (
    <div className="fixed left-12 top-1/2 -translate-y-1/2 z-40 w-[calc(50vw-35vh-100px+5mm)] h-[70vh] bg-white/70 backdrop-blur-[24px] backdrop-saturate-[180%] border-[1px] border-black/5 rounded-[24px] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] overflow-hidden flex flex-col transition-all duration-500">
      
      <div className="flex-1 flex flex-col justify-start items-center overflow-y-auto pr-2 custom-scrollbar">
        {/* Aligning the mission items to the top */}
        <div className="grid grid-cols-3 gap-3 px-1 pt-1 pb-8">
          {missions.map((mission, index) => {
            const isDone = mission.status === 'Terminé';
            const inProgress = mission.status === 'En cours';
            
            const baseShadow = '0 4px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)';
            
            const activeGlow = isDone 
              ? '0 0 15px rgba(40,224,90,0.1), 0 5px 20px rgba(40,224,90,0.08)' 
              : inProgress
                ? '0 0 15px rgba(255,149,0,0.1), 0 5px 20px rgba(255,149,0,0.08)'
                : '0 0 15px rgba(0,0,0,0.05), 0 5px 20px rgba(0,0,0,0.04)';
                
            const transparentGlow = isDone
              ? '0 0 15px rgba(40,224,90,0), 0 5px 20px rgba(40,224,90,0)'
              : inProgress
                ? '0 0 15px rgba(255,149,0,0), 0 5px 20px rgba(255,149,0,0)'
                : '0 0 15px rgba(0,0,0,0), 0 5px 20px rgba(0,0,0,0)';

            const fullShadow = `${baseShadow}, ${activeGlow}`;
            const offShadow = `${baseShadow}, ${transparentGlow}`;
                
            const textGradient = isDone
              ? 'from-green-500 via-emerald-600 to-teal-800'
              : inProgress
                ? 'from-amber-400 via-orange-500 to-rose-600'
                : 'from-slate-600 via-slate-800 to-black';
            
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: [1, 1, 1.02, 1],
                  boxShadow: [offShadow, offShadow, fullShadow, offShadow]
                }}
                transition={{ 
                  boxShadow: {
                    duration: 15,
                    repeat: Infinity,
                    times: [0, 0.666, 0.833, 1],
                    ease: "easeInOut"
                  },
                  scale: {
                    duration: 15,
                    repeat: Infinity,
                    times: [0, 0.666, 0.833, 1],
                    ease: "easeInOut"
                  },
                  opacity: { duration: 0.4, delay: index * 0.1 }
                }}
                onClick={() => onMissionClick && onMissionClick(mission)}
                className={`group relative w-[95px] p-3 rounded-[24px] bg-white/95 backdrop-blur-xl transition-all duration-[400ms] ease-out cursor-pointer flex flex-col items-center justify-center gap-1.5 aspect-square text-center hover:scale-[1.02] active:scale-[0.96]`}
              >
                <h3 className={`text-[14px] font-bold tracking-[-0.02em] leading-tight bg-gradient-to-br ${textGradient} bg-clip-text text-transparent`}>
                  {mission.clientName}
                </h3>
                
                <div className="flex items-center opacity-100">
                  <span className={`text-[16px] font-medium tracking-[-0.01em] bg-gradient-to-br ${textGradient} bg-clip-text text-transparent`}>{mission.time}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
