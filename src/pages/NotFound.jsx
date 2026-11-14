import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-slate-900">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#2563EB]/30 shadow-xs mx-auto mb-4">
          <img src="/logo.jpg" alt={t('brandName')} className="w-full h-full object-cover" />
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-[#101C32]">{t('eventNotFoundTitle')}</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {t('eventNotFoundDesc')}
        </p>

        <div className="mt-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#101C32] hover:bg-[#1E293B] rounded-xl shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-blue-300" />
            <span>{t('backToDashboard')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
