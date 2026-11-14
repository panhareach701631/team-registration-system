import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

export default function LanguageToggle({ className = '', dark = false }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border text-xs font-semibold ${
        dark
          ? 'bg-white/10 border-white/15 text-slate-200'
          : 'bg-slate-100 border-slate-200 text-slate-600'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('km')}
        aria-label="Switch language to Khmer"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
          lang === 'km'
            ? 'bg-[#2563EB] text-white shadow-xs font-bold'
            : dark
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-[#101C32] hover:bg-white/70'
        }`}
      >
        <span className="text-sm leading-none">🇰🇭</span>
        <span>ខ្មែរ</span>
      </button>

      <button
        type="button"
        onClick={() => setLang('en')}
        aria-label="Switch language to English"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-[#2563EB] text-white shadow-xs font-bold'
            : dark
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-[#101C32] hover:bg-white/70'
        }`}
      >
        <span className="text-sm leading-none">🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
