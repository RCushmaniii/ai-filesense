import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from './en.json';
import esMX from './es-MX.json';

export type Language = 'en' | 'es-MX';

export const languages: Record<Language, { name: string; nativeName: string }> = {
  'en': { name: 'English', nativeName: 'English' },
  'es-MX': { name: 'Spanish (Mexico)', nativeName: 'Español (México)' },
};

const translations: Record<Language, typeof en> = {
  'en': en,
  'es-MX': esMX as typeof en,
};

type TranslationKeys = typeof en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'filesense-language';

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key]?.toString() ?? `{${key}}`;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'en' || stored === 'es-MX')) {
        return stored as Language;
      }

      // Check browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith('es')) {
        return 'es-MX';
      }
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[language], key);

    if (!value) {
      // Fallback to English
      const fallback = getNestedValue(translations['en'], key);
      if (!fallback) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
      return params ? interpolate(fallback, params) : fallback;
    }

    return params ? interpolate(value, params) : value;
  }, [language]);

  useEffect(() => {
    // Set document language attribute
    document.documentElement.lang = language === 'es-MX' ? 'es' : 'en';
  }, [language]);

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
      translations: translations[language]
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}
