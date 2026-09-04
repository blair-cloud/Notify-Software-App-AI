import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../data/translations';
import { GoogleTranslateIcon } from './GoogleTranslateIcon';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'ENG', flag: '🇬🇧' },
  { code: 'rw', label: 'KINY', flag: '🇷🇼' },
  { code: 'fr', label: 'FRA', flag: '🇫🇷' },
];

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-black hover:text-[#331A6F] transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
        aria-label={t.selectLanguage}
        title={t.selectLanguage}
      >
        <GoogleTranslateIcon className="w-5 h-5 fill-current" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md py-1 z-50 flex flex-col min-w-[100px]">
          {languages.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setLanguage(item.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                language === item.code
                  ? 'bg-[#331A6F] text-white'
                  : 'text-black hover:bg-slate-100'
              }`}
            >
              <span>{item.flag}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
