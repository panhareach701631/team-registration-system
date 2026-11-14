import React from 'react';
import { BarChart3, Clock, Users } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../utils/formatting';
import ImageWithFallback from './ImageWithFallback';

export default function AnalyticsSection({ data }) {
  const { t } = useLanguage();

  const teamTotal = Math.max(
    data.teamAPlayers + data.teamBPlayers + data.teamCPlayers,
    1
  );

  const teamBars = [
    {
      label: t('teamAPlayers'),
      short: 'Team A',
      count: data.teamAPlayers,
      pct: Math.round((data.teamAPlayers / teamTotal) * 100),
      barColor: '#2563EB',
      bgLight: 'bg-blue-50 text-[#2563EB]',
    },
    {
      label: t('teamBPlayers'),
      short: 'Team B',
      count: data.teamBPlayers,
      pct: Math.round((data.teamBPlayers / teamTotal) * 100),
      barColor: '#DC2626',
      bgLight: 'bg-red-50 text-[#DC2626]',
    },
    {
      label: t('teamCPlayers'),
      short: 'Team C',
      count: data.teamCPlayers,
      pct: Math.round((data.teamCPlayers / teamTotal) * 100),
      barColor: '#16A34A',
      bgLight: 'bg-emerald-50 text-[#16A34A]',
    },
  ];

  const topEvents = (data.events || []).slice(0, 4);
  const maxEventPlayers = Math.max(
    ...topEvents.map((e) => e.stats?.totalPlayers || 0),
    1
  );

  const recentActivity = data.recentActivity || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Registration Analytics Charts */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#101C32]">{t('analyticsTitle')}</h2>
              <p className="text-[11px] text-slate-500">{t('teamDistribution')}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#101C32] bg-slate-100 px-2.5 py-1 rounded-lg">
            {data.totalPlayers} {t('playersCountLabel')}
          </span>
        </div>

        {/* Team Distribution Progress Bars */}
        <div className="space-y-4">
          {teamBars.map((bar) => (
            <div key={bar.short} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#101C32]">{bar.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${bar.bgLight}`}>
                    {bar.count} {t('playersCountLabel')}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] w-9 text-right">
                    {data.totalPlayers > 0 ? `${bar.pct}%` : '0%'}
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.totalPlayers > 0 ? bar.pct : 0}%`,
                    backgroundColor: bar.barColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Event Participation Bar Chart */}
        {topEvents.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t('topEventsChart')}
            </h3>
            <div className="space-y-2.5">
              {topEvents.map((evt) => {
                const count = evt.stats?.totalPlayers || 0;
                const widthPct = Math.round((count / maxEventPlayers) * 100);
                return (
                  <div key={evt.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <div className="col-span-5 sm:col-span-4 truncate font-medium text-slate-700" title={evt.topic}>
                      {evt.topic}
                    </div>
                    <div className="col-span-5 sm:col-span-6 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#101C32] transition-all duration-500"
                        style={{ width: `${count > 0 ? Math.max(widthPct, 6) : 0}%` }}
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-[#101C32]">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Recent Registration Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
          <div className="p-2 rounded-xl bg-emerald-50 text-[#16A34A] border border-emerald-100">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[#101C32]">{t('recentActivity')}</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <Users className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-xs">{t('noActivityYet')}</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <ImageWithFallback
                  src={item.avatar_url}
                  fallbackText={item.name}
                  alt={item.name}
                  rounded="rounded-full"
                  className="w-9 h-9 shrink-0 text-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#101C32] truncate">{item.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#2563EB] border border-blue-100 shrink-0">
                      #{item.player_no}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                      style={{ backgroundColor: item.team_color }}
                    />
                    {item.team_name} • {item.event_topic}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
