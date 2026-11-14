import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/StatCard';
import AnalyticsSection from '../components/AnalyticsSection';
import ConfirmDialog from '../components/ConfirmDialog';
import QrCodeModal from '../components/QrCodeModal';
import ImageWithFallback from '../components/ImageWithFallback';
import TeamSlideshow from '../components/TeamSlideshow';
import {
  Calendar,
  Users,
  UserCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  Search,
  QrCode,
  Copy,
  Check,
  FileText,
  Trash2,
  Edit,
  RefreshCw,
  MapPin,
  Clock,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { formatShortDate, getRegistrationUrl } from '../utils/formatting';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const toast = useToast();

  const [data, setData] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalPlayers: 0,
    teamAPlayers: 0,
    teamBPlayers: 0,
    teamCPlayers: 0,
    openEventsCount: 0,
    closedEventsCount: 0,
    events: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' | 'TABLE'
  const [copiedId, setCopiedId] = useState(null);

  const [qrModalEvent, setQrModalEvent] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: 'Confirm',
    isLoading: false,
  });

  const loadDashboardData = useCallback(
    async (showSuccessToast = false) => {
      setLoading(true);
      try {
        const overview = await db.getDashboardOverview();
        setData(overview);
        if (showSuccessToast) {
          toast.success(t('refreshedSuccess'));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        toast.error(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    },
    [t, toast]
  );

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const overview = await db.getDashboardOverview();
        if (active) setData(overview);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (active) toast.error(err.message || 'Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [toast]);

  const filteredEvents = (data.events || []).filter((event) => {
    const matchesSearch =
      event.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = async (event) => {
    const url = getRegistrationUrl(event.registration_token);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedId(event.id);
    toast.success(t('linkCopied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = (event) => {
    const willClose = event.status === 'OPEN';
    setConfirmDialog({
      isOpen: true,
      title: willClose ? t('confirmCloseTitle') : t('confirmReopenTitle'),
      message: willClose ? t('confirmCloseMsg') : t('confirmReopenMsg'),
      confirmText: willClose ? t('closeRegistration') : t('reopenRegistration'),
      type: willClose ? 'warning' : 'info',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          await db.setEventStatus(event.id, willClose ? 'CLOSED' : 'OPEN');
          await loadDashboardData(false);
          toast.success(willClose ? t('eventClosedToast') : t('eventOpenedToast'));
        } catch (err) {
          toast.error(err.message || 'Failed to update event status');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  const handleDeleteEvent = (event) => {
    setConfirmDialog({
      isOpen: true,
      title: t('confirmDeleteTitle'),
      message: t('confirmDeleteMsg'),
      confirmText: t('btnDeletePermanently'),
      type: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          await db.deleteEvent(event.id);
          await loadDashboardData(false);
          toast.success(t('eventDeletedToast'));
        } catch (err) {
          toast.error(err.message || 'Failed to delete event');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#101C32]">
            {t('dashboardOverview')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('eventManagementSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-[#101C32] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>

          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#101C32] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Users className="w-4 h-4 text-[#2563EB]" />
            <span>{t('teamMembersNav')}</span>
          </Link>

          <Link
            to="/admin/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createNewEvent')}</span>
          </Link>
        </div>
      </div>

      {/* Interactive Team Slideshow Showcase */}
      <TeamSlideshow showDirectoryButton />

      {/* 8 Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title={t('totalEvents')}
          value={data.totalEvents}
          subtitle={t('allCreated')}
          icon={Calendar}
          color="navy"
        />
        <StatCard
          title={t('totalRegistrations')}
          value={data.totalRegistrations}
          subtitle={t('submittedForms')}
          icon={UserCheck}
          color="blue"
        />
        <StatCard
          title={t('totalPlayers')}
          value={data.totalPlayers}
          subtitle={t('registeredRoster')}
          icon={Users}
          color="navy"
        />
        <StatCard
          title={t('openEvents')}
          value={data.openEventsCount}
          subtitle={t('acceptingEntries')}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title={t('teamAPlayers')}
          value={data.teamAPlayers}
          subtitle="Team A"
          icon={Users}
          color="blue"
        />
        <StatCard
          title={t('teamBPlayers')}
          value={data.teamBPlayers}
          subtitle="Team B"
          icon={Users}
          color="red"
        />
        <StatCard
          title={t('teamCPlayers')}
          value={data.teamCPlayers}
          subtitle="Team C"
          icon={Users}
          color="green"
        />
        <StatCard
          title={t('closedEvents')}
          value={data.closedEventsCount}
          subtitle={t('registrationLocked')}
          icon={Lock}
          color="slate"
        />
      </div>

      {/* Registration Analytics Charts & Recent Activity */}
      <AnalyticsSection data={data} />

      {/* Event Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          <div>
            <h2 className="text-base font-bold text-[#101C32]">{t('eventManagement')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('eventManagementSubtitle')}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('searchPlaceholder')}
                className="w-full sm:w-56 pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#2563EB] text-[#101C32] placeholder:text-slate-400"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold">
              {['ALL', 'OPEN', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#101C32] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-[#101C32]'
                  }`}
                >
                  {st === 'ALL' ? t('filterAll') : st === 'OPEN' ? t('filterOpen') : t('filterClosed')}
                </button>
              ))}
            </div>

            {/* View Toggle (Desktop) */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                aria-label={t('viewCards')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'CARDS'
                    ? 'bg-white text-[#101C32] shadow-2xs'
                    : 'text-slate-500 hover:text-[#101C32]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('viewCards')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                aria-label={t('viewTable')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-[#101C32] shadow-2xs'
                    : 'text-slate-500 hover:text-[#101C32]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>{t('viewTable')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="text-sm font-bold text-[#101C32]">{t('noEventsFound')}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : t('noEventsSubtitle')}
            </p>
            <Link
              to="/admin/events/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createNewEvent')}</span>
            </Link>
          </div>
        ) : (
          <>
            {/* CARDS VIEW (Always visible on mobile < md, or when viewMode === 'CARDS' on desktop) */}
            <div className={`${viewMode === 'TABLE' ? 'md:hidden' : ''} p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5`}>
              {filteredEvents.map((event) => {
                const playerCount = event.stats?.totalPlayers || 0;
                const teams = event.teams || [];

                return (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Cover Image Header */}
                    <div className="relative h-40 w-full bg-[#101C32]">
                      <ImageWithFallback
                        src={event.cover_image_url}
                        fallbackSrc="/images/club-pitch.jpg"
                        alt={event.topic}
                        rounded="rounded-none"
                        className="w-full h-full"
                      />
                      <div className="absolute inset-0 bg-[#101C32]/45" />

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {event.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#16A34A] text-white shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            OPEN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/90 text-slate-200 border border-white/15">
                            <Lock className="w-3 h-3" />
                            CLOSED
                          </span>
                        )}
                      </div>

                      {/* Player Count Badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-[#101C32] text-xs font-bold shadow-xs flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>{playerCount}</span>
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="text-base font-bold leading-snug line-clamp-1">
                          {event.topic}
                        </h3>
                      </div>
                    </div>

                    {/* Event Metadata + Teams */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span className="truncate">{event.event_time || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span className="truncate">{event.location || '—'}</span>
                        </div>

                        {/* Team Badges Row */}
                        <div className="pt-2 flex flex-wrap gap-2">
                          {teams.map((tm) => {
                            const count = (event.registrations || []).filter(
                              (r) => r.team_letter === tm.team_letter
                            ).length;
                            return (
                              <div
                                key={tm.team_letter}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[11px]"
                              >
                                {tm.logo_url ? (
                                  <img
                                    src={tm.logo_url}
                                    alt={tm.team_name}
                                    loading="lazy"
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                ) : (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: tm.team_color }}
                                  />
                                )}
                                <span className="font-semibold text-[#101C32] max-w-24 truncate">
                                  {tm.team_name}
                                </span>
                                <span className="font-mono font-bold text-slate-500">({count})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Action Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(event)}
                            className="p-2 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t('copyLink')}
                            aria-label={t('copyLink')}
                          >
                            {copiedId === event.id ? (
                              <Check className="w-4 h-4 text-[#16A34A]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrModalEvent(event)}
                            className="p-2 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t('viewQr')}
                            aria-label={t('viewQr')}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(event)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              event.status === 'OPEN'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-[#16A34A] hover:bg-emerald-50'
                            }`}
                            title={event.status === 'OPEN' ? t('closeRegistration') : t('reopenRegistration')}
                            aria-label={event.status === 'OPEN' ? t('closeRegistration') : t('reopenRegistration')}
                          >
                            {event.status === 'OPEN' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>

                          <Link
                            to={`/admin/events/${event.id}/edit`}
                            className="p-2 text-slate-600 hover:text-[#101C32] hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('editEvent')}
                            aria-label={t('editEvent')}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(event)}
                            className="p-2 text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={t('deleteEvent')}
                            aria-label={t('deleteEvent')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <Link
                          to={`/admin/events/${event.id}/report`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#101C32] hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-300" />
                          <span>{t('viewReport')}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW */}
            {viewMode === 'TABLE' && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 w-12 text-center">{t('colNo')}</th>
                      <th className="py-3 px-4">{t('colTopic')}</th>
                      <th className="py-3 px-4">{t('colTime')}</th>
                      <th className="py-3 px-4 hidden lg:table-cell">{t('colLocation')}</th>
                      <th className="py-3 px-4 text-center">{t('colTotalPlayers')}</th>
                      <th className="py-3 px-4 text-center">{t('colStatus')}</th>
                      <th className="py-3 px-4 hidden xl:table-cell">{t('colCreatedDate')}</th>
                      <th className="py-3 px-4 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((event, index) => {
                      const playerCount = event.stats?.totalPlayers || 0;
                      return (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <ImageWithFallback
                                src={event.cover_image_url}
                                fallbackSrc="/images/club-pitch.jpg"
                                alt={event.topic}
                                rounded="rounded-lg"
                                className="w-12 h-9 shrink-0"
                              />
                              <span className="font-bold text-[#101C32]">{event.topic}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{event.event_time || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-600 hidden lg:table-cell">
                            {event.location || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#2563EB] rounded-lg font-bold">
                              {playerCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {event.status === 'OPEN' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                                OPEN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <Lock className="w-3 h-3" />
                                CLOSED
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 hidden xl:table-cell">
                            {formatShortDate(event.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(event)}
                                className="p-2 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg cursor-pointer"
                                title={t('copyLink')}
                                aria-label={t('copyLink')}
                              >
                                {copiedId === event.id ? (
                                  <Check className="w-4 h-4 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQrModalEvent(event)}
                                className="p-2 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg cursor-pointer"
                                title={t('viewQr')}
                                aria-label={t('viewQr')}
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <Link
                                to={`/admin/events/${event.id}/report`}
                                className="p-2 text-[#101C32] hover:text-[#2563EB] hover:bg-blue-50 rounded-lg"
                                title={t('viewReport')}
                                aria-label={t('viewReport')}
                              >
                                <FileText className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(event)}
                                className={`p-2 rounded-lg cursor-pointer ${
                                  event.status === 'OPEN'
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-[#16A34A] hover:bg-emerald-50'
                                }`}
                                title={event.status === 'OPEN' ? t('closeRegistration') : t('reopenRegistration')}
                                aria-label={event.status === 'OPEN' ? t('closeRegistration') : t('reopenRegistration')}
                              >
                                {event.status === 'OPEN' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                              <Link
                                to={`/admin/events/${event.id}/edit`}
                                className="p-2 text-slate-500 hover:text-[#101C32] hover:bg-slate-100 rounded-lg"
                                title={t('editEvent')}
                                aria-label={t('editEvent')}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(event)}
                                className="p-2 text-[#DC2626] hover:bg-red-50 rounded-lg cursor-pointer"
                                title={t('deleteEvent')}
                                aria-label={t('deleteEvent')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModalEvent && (
        <QrCodeModal
          isOpen={Boolean(qrModalEvent)}
          onClose={() => setQrModalEvent(null)}
          event={qrModalEvent}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={t('btnCancel')}
        type={confirmDialog.type}
        isLoading={confirmDialog.isLoading}
      />
    </div>
  );
}
