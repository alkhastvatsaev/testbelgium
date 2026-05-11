"use client";
import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GLASS_PANEL_OVERFLOW_PADDING } from '@/core/ui/glassPanelChrome';
import { useTranslation, Language } from '@/core/i18n/I18nContext';

const languages: { code: Language; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
];

export default function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useTranslation();

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
        className="fixed top-[24px] left-1/2 -translate-x-1/2 z-50 flex items-center justify-end w-[calc(100vw-48px)] lg:w-[70vh] h-[70px] bg-white/95 backdrop-blur-[24px] border-[1px] border-black/[0.06] px-8 rounded-[24px] font-semibold text-gray-900/60 hover:text-gray-900 hover:bg-white transition-all duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_26px_56px_-22px_rgba(15,23,42,0.08)] group"
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
              className="relative flex max-h-[min(90vh,720px)] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-[24px] border-[1px] border-black/[0.06] bg-white/75 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.14),0_28px_56px_-22px_rgba(15,23,42,0.1)] backdrop-blur-[24px]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <Command className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                
                {/* Header: Search Input & Close */}
                <div className="flex items-center px-8 border-b border-black/5 bg-white/50 backdrop-blur-md z-10">
                  <Search className="w-6 h-6 opacity-30 mr-4 shrink-0" />
                  <Command.Input 
                    autoFocus 
                    placeholder={t('spotlight.search_placeholder')}
                    className="flex h-[70px] w-full bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none text-[20px] font-medium"
                  />
                  <X 
                    className="w-5 h-5 opacity-30 cursor-pointer hover:opacity-60 transition-opacity shrink-0" 
                    onClick={() => setOpen(false)}
                  />
                </div>

                {/* Sub-header: Premium Language Selector */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-black/5 bg-slate-50/40 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-medium px-2">
                    <Globe className="w-4 h-4 opacity-70" />
                    <span className="hidden sm:inline">Langue / Language / Taal</span>
                  </div>
                  
                  {/* Apple Segmented Control Style */}
                  <div className="relative flex items-center p-1 bg-black/[0.04] rounded-full shadow-inner">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`relative z-10 px-5 py-1.5 text-sm font-bold transition-colors duration-200 rounded-full ${
                          language === lang.code ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {language === lang.code && (
                          <motion.div
                            layoutId="active-language"
                            className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 tracking-wide">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <Command.List className={`${GLASS_PANEL_OVERFLOW_PADDING} max-h-[300px]`}>
                  <Command.Empty className="px-6 py-8 text-center text-gray-500/60 font-medium">
                    {t('spotlight.no_results')}
                  </Command.Empty>
                </Command.List>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
