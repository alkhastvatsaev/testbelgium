"use client";
 
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import fr from './locales/fr.json';
import en from './locales/en.json';
import nl from './locales/nl.json';
 
export type Language = 'fr' | 'en' | 'nl';
 
type Translations = Record<string, any>;
 
const dictionaries: Record<Language, Translations> = {
  fr,
  en,
  nl,
};
 
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}
 
const I18nContext = createContext<I18nContextType | undefined>(undefined);
 
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedLang = localStorage.getItem('belgmap_lang') as Language;
    if (storedLang && ['fr', 'en', 'nl'].includes(storedLang)) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('belgmap_lang', lang);
    }
  };

  const t = (key: string): string => {
    // Avoid hydration mismatch by rendering default keys or French on first pass if needed, 
    // but typically dictionaries are small and fast.
    const dict = dictionaries[language] as any;
    const keys = key.split('.');
    let result = dict;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  };

  // Wait for client to avoid hydration mismatch if language is different from 'fr'
  if (!isClient) {
    return (
      <I18nContext.Provider value={{ language: 'fr', setLanguage, t: (key) => {
        const dict = dictionaries['fr'] as any;
        const keys = key.split('.');
        let result = dict;
        for (const k of keys) {
          if (result && typeof result === 'object' && k in result) {
            result = result[k];
          } else {
            return key;
          }
        }
        return typeof result === 'string' ? result : key;
      } }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
 
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
 