import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Language, Translations, translations } from '../data/translations';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'notify_app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserProfile } = useAuth();
  const lastSyncedUserLang = useRef<string | null>(null);

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved === 'rw' || saved === 'fr' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  // Synchronize language when user profile loads or changes from backend
  useEffect(() => {
    if (user?.language && (user.language === 'rw' || user.language === 'fr' || user.language === 'en')) {
      if (lastSyncedUserLang.current !== user.language) {
        lastSyncedUserLang.current = user.language;
        setLanguageState(user.language);
        try {
          localStorage.setItem(LANGUAGE_KEY, user.language);
        } catch {
          // Ignore
        }
      }
    }
  }, [user?.language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }

    // Persist to user profile backend if user is authenticated
    if (user && updateUserProfile) {
      try {
        lastSyncedUserLang.current = lang;
        await updateUserProfile({ language: lang });
      } catch (err) {
        console.warn('Could not persist language to user profile:', err);
      }
    }
  };

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

