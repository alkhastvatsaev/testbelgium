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
  t: (key: string) => any;
}
 
const I18nContext = createContext<I18nContextType | undefined>(undefined);
 
function resolveTranslation(dict: any, key: string): any {
  const keys = key.split('.');
  let result = dict;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  // Can be string, array, number, object… Consumers handle it.
  return result;
}

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

  const t = (key: string): any => resolveTranslation(dictionaries[language] as any, key);

  // Wait for client to avoid hydration mismatch if language is different from 'fr'
  if (!isClient) {
    return (
      <I18nContext.Provider value={{ language: 'fr', setLanguage, t: (key) => resolveTranslation(dictionaries.fr as any, key) }}>
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
 