"use client";
import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, MapPin, Truck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpotlightSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <button 
        id="spotlight-search"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la recherche"
        className="fixed top-[24px] left-1/2 -translate-x-1/2 z-50 flex items-center justify-end w-[calc(100vw-48px)] lg:w-[70vh] h-[70px] bg-white/95 backdrop-blur-[24px] border-[1px] border-white/40 px-8 rounded-[24px] font-semibold text-gray-900/60 hover:text-gray-900 hover:bg-white transition-all duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] group"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <Search className="w-6 h-6 opacity-60 group-hover:scale-110 transition-transform" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[20vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[24px] bg-white/75 border-[1px] border-black/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-[24px]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <Command className="w-full flex flex-col overflow-hidden">
                <div className="flex items-center px-8 border-b border-black/5">
                  <Search className="w-6 h-6 opacity-30 mr-4" />
                  <Command.Input 
                    autoFocus 
                    placeholder="Rechercher une mission, un technicien..." 
                    className="flex h-[70px] w-full bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none text-[20px] font-medium"
                  />
                  <X 
                    className="w-5 h-5 opacity-30 cursor-pointer hover:opacity-60 transition-opacity" 
                    onClick={() => setOpen(false)}
                  />
                </div>
                
                <Command.List className="max-h-[300px] overflow-y-auto p-2">
                  <Command.Empty className="px-6 py-8 text-center text-gray-500/60 font-medium">
                    Aucun résultat trouvé.
                  </Command.Empty>
                  
                  <Command.Group heading="Actions" className="px-4 py-2 text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
                    <Command.Item className="flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer hover:bg-black/5 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-semibold text-gray-800">Voir la carte</span>
                        <span className="text-[12px] text-gray-500">Afficher toutes les interventions</span>
                      </div>
                    </Command.Item>
                    
                    <Command.Item className="flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer hover:bg-black/5 transition-colors group mt-1">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-semibold text-gray-800">Techniciens</span>
                        <span className="text-[12px] text-gray-500">Gérer les équipes sur le terrain</span>
                      </div>
                    </Command.Item>
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
