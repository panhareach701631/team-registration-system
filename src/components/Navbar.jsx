import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { db } from '../services/db';
import { LogOut, Database, ShieldCheck, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageToggle from './LanguageToggle';

export default function Navbar({ onToggleSidebar }) {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left section: Mobile Menu + Preserved Club Logo & Branding */}
          <div className="flex items-center gap-3 min-w-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 text-slate-600 hover:text-[#101C32] hover:bg-slate-100 rounded-xl lg:hidden transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link
              to={isAuthenticated ? '/admin/dashboard' : '/admin'}
              className="flex items-center gap-3 group min-w-0"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#2563EB]/30 ring-2 ring-[#101C32]/10 shadow-xs shrink-0 group-hover:scale-105 transition-transform bg-[#101C32]">
                <img
                  src="/logo.jpg"
                  alt="ក្រុមខ្មែរតែមួយ - Khmer Team One"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-[#101C32] leading-tight truncate">
                    {t('brandName')}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-full shrink-0">
                    Sports Admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium leading-tight truncate">
                  {t('systemTitle')}
                </span>
              </div>
            </Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-[#F8FAFC] text-slate-600 border-slate-200">
              <Database className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[#101C32] font-semibold">
                {db.isLiveSupabase ? 'Supabase DB' : 'Local Engine'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  db.isLiveSupabase ? 'bg-[#16A34A] animate-pulse' : 'bg-amber-500'
                }`}
              />
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden md:flex items-center gap-1.5 text-xs text-[#101C32] font-semibold bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>{t('adminSession')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                  title={t('logout')}
                  aria-label={t('logout')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
