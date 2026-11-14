import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'navy' }) {
  const colorStyles = {
    navy: 'bg-[#101C32]/8 text-[#101C32] border-slate-200',
    blue: 'bg-blue-50 text-[#2563EB] border-blue-200',
    green: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
    emerald: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
    red: 'bg-red-50 text-[#DC2626] border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[color] || 'bg-blue-50 text-[#2563EB] border-blue-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-200">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 leading-snug">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl border shrink-0 ${colorStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold tracking-tight text-[#101C32]">{value}</span>
        {subtitle && <span className="text-xs text-slate-500 font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}
