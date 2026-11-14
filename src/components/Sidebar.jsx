import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { LayoutDashboard, PlusCircle, Shield, Users, X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useLanguage();

  const navItems = [
    {
      to: '/admin/dashboard',
      label: t('dashboardOverview'),
      icon: LayoutDashboard,
    },
    {
      to: '/admin/members',
      label: t('teamMembersNav'),
      icon: Users,
    },
    {
      to: '/admin/events/new',
      label: t('createNewEvent'),
      icon: PlusCircle,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#101C32]/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-[#101C32] text-slate-100 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between shadow-lg`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('management')}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Club Visual Identity Card inside Sidebar */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <div className="relative h-24 w-full">
              <img
                src="/images/club-pitch.jpg"
                alt="Khmer Team One Club"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-[#101C32]/55 flex items-end p-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.jpg"
                    alt="Logo"
                    className="w-8 h-8 rounded-full border border-white/40 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {t('brandName')}
                    </span>
                    <span className="text-[10px] text-blue-300 block truncate">
                      Official League Console
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            <div className="px-3 pb-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              {t('management')}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Security Notice */}
        <div className="p-4 m-3 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <span>{t('adminCredentials')}</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
            {t('systemSubtitle')}
          </p>
        </div>
      </aside>
    </>
  );
}
