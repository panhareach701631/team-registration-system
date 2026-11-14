import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import QrCodeModal from '../components/QrCodeModal';
import ImageWithFallback from '../components/ImageWithFallback';
import ImageUploader from '../components/ImageUploader';
import {
  Download,
  Printer,
  Image as ImageIcon,
  ArrowLeft,
  MapPin,
  Clock,
  Search,
  Trash2,
  Edit,
  AlertTriangle,
  Lock,
  Unlock,
  QrCode,
  Copy,
  Check,
  User,
} from 'lucide-react';
import { formatDate, calculateEventStats, getRegistrationUrl } from '../utils/formatting';
import { exportEventPdf } from '../utils/exportPdf';
import { exportEventAsPng } from '../utils/exportPng';
import { normalizeName, normalizePlayerNo } from '../utils/normalize';

export default function EventReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(() => new Date().toISOString());
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Registration state
  const [editingReg, setEditingReg] = useState(null);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    team_letter: 'A',
    player_no: '',
    avatar_url: '',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
    type: 'danger',
  });

  const reloadEvent = useCallback(async () => {
    try {
      const data = await db.getEventById(id);
      if (!data) {
        toast.error(t('eventNotFoundTitle'));
        navigate('/admin/dashboard');
        return;
      }
      setEvent(data);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      console.error('Error loading report data:', err);
      toast.error(err?.message || t('errorGeneric'));
    }
  }, [id, navigate, toast, t]);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      try {
        const data = await db.getEventById(id);
        if (!active) return;
        if (!data) {
          toast.error(t('eventNotFoundTitle'));
          navigate('/admin/dashboard');
          return;
        }
        setEvent(data);
        setGeneratedAt(new Date().toISOString());
      } catch (err) {
        console.error('Error loading report data:', err);
        if (active) {
          toast.error(err?.message || t('errorGeneric'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [id, navigate, toast, t]);

  if (loading || !event) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
        <p className="font-medium">{t('loadingReport')}</p>
      </div>
    );
  }

  const teams = event.teams || [];
  const registrations = event.registrations || [];
  const stats = calculateEventStats(registrations);

  const teamMap = {};
  ['A', 'B', 'C'].forEach((letter) => {
    teamMap[letter] = teams.find((item) => item.team_letter === letter) || {
      team_letter: letter,
      team_name: `Team ${letter}`,
      captain_name: 'Unassigned',
      team_color: letter === 'A' ? '#2563EB' : letter === 'B' ? '#DC2626' : '#16A34A',
      logo_url: '',
    };
  });

  const nameOccurrences = {};
  const noOccurrences = {};
  registrations.forEach((r) => {
    const normName = r.normalized_name || normalizeName(r.name);
    nameOccurrences[normName] = (nameOccurrences[normName] || 0) + 1;

    const normNo = r.player_no_norm || normalizePlayerNo(r.player_no || r.number_of_players);
    if (normNo) {
      noOccurrences[normNo] = (noOccurrences[normNo] || 0) + 1;
    }
  });

  const filteredRegs = registrations.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(query) ||
      String(r.player_no || r.number_of_players || '').toLowerCase().includes(query);
    const matchesTeam = teamFilter === 'ALL' || r.team_letter === teamFilter;
    return matchesSearch && matchesTeam;
  });

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      exportEventPdf(event, teams, registrations);
      toast.success(t('btnDownloadPdf'));
    } catch (err) {
      toast.error(err?.message || t('errorGeneric'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      const cleanTopic = (event.topic || 'event').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
      await exportEventAsPng(event, teams, registrations, `Report_${cleanTopic}`);
      toast.success(t('btnDownloadPng'));
    } catch (err) {
      console.error('PNG Export error:', err);
      toast.error(err?.message || t('errorGeneric'));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleStatus = () => {
    const willClose = event.status === 'OPEN';
    setConfirmDialog({
      isOpen: true,
      title: willClose ? t('confirmCloseTitle') : t('confirmReopenTitle'),
      message: willClose ? t('confirmCloseMsg') : t('confirmReopenMsg'),
      confirmText: willClose ? t('closeRegistration') : t('reopenRegistration'),
      type: willClose ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          await db.setEventStatus(event.id, willClose ? 'CLOSED' : 'OPEN');
          await reloadEvent();
          toast.success(willClose ? t('statusClosed') : t('statusOpen'));
        } catch (err) {
          toast.error(err?.message || t('errorGeneric'));
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteRegistration = (reg) => {
    setConfirmDialog({
      isOpen: true,
      title: t('deletePlayerConfirm'),
      message: `${reg.name} (Player #${reg.player_no || reg.number_of_players}) - Team ${reg.team_letter}`,
      confirmText: t('btnConfirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await db.deleteRegistration(reg.id);
          await reloadEvent();
          toast.success(t('deleteSuccess'));
        } catch (err) {
          toast.error(err?.message || t('errorGeneric'));
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleOpenEdit = (reg) => {
    setEditingReg(reg);
    setEditError('');
    setEditFormData({
      name: reg.name,
      team_letter: reg.team_letter,
      player_no: String(reg.player_no || reg.number_of_players || ''),
      avatar_url: reg.avatar_url || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editFormData.name.trim()) {
      setEditError(t('errNameReq'));
      toast.error(t('errNameReq'));
      return;
    }
    if (!editFormData.player_no.trim()) {
      setEditError(t('errNumberReq'));
      toast.error(t('errNumberReq'));
      return;
    }

    setSavingEdit(true);
    try {
      await db.updateRegistration(editingReg.id, {
        name: editFormData.name.trim(),
        team_letter: editFormData.team_letter,
        player_no: editFormData.player_no.trim(),
        avatar_url: editFormData.avatar_url || null,
      });
      setEditingReg(null);
      await reloadEvent();
      toast.success(t('saveSuccess'));
    } catch (err) {
      const msg = err?.message || t('errorGeneric');
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getRegistrationUrl(event.registration_token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="space-y-6 pb-20 text-slate-900">
      {/* Action Header */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#101C32] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('backToDashboard')}</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-[#2563EB]">{t('officialReport')}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copiedLink ? t('linkCopied') : t('copyLink')}</span>
          </button>

          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{t('qrCodeBtn')}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-colors border ${
              event.status === 'OPEN'
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                : 'text-[#16A34A] bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            {event.status === 'OPEN' ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span>{event.status === 'OPEN' ? t('closeRegistration') : t('reopenRegistration')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#101C32] hover:bg-[#1E293B] disabled:opacity-60 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            <span>{t('btnDownloadPdf')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-xl shadow-xs transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t('btnDownloadPng')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('btnPrintReport')}</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT WRAPPER */}
      <div
        id="report-printable-area"
        className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs"
      >
        {/* Optional Event Cover Strip */}
        {event.cover_image_url && (
          <div className="relative h-36 sm:h-44 w-full bg-[#101C32] overflow-hidden">
            <ImageWithFallback
              src={event.cover_image_url}
              fallbackSrc="/images/club-pitch.jpg"
              alt={event.topic}
              className="w-full h-full object-cover opacity-85"
              rounded="rounded-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101C32]/85 via-[#101C32]/25 to-transparent" />
          </div>
        )}

        <div className="p-5 sm:p-8 space-y-8">
          {/* Report Top Header with Logo */}
          <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#2563EB]/30 shadow-xs shrink-0 bg-white">
                <img src="/logo.jpg" alt={t('brandName')} className="w-full h-full object-cover" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {t('brandName')} • {t('officialReport')}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      event.status === 'OPEN'
                        ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        : 'bg-red-50 text-[#DC2626] border border-red-200'
                    }`}
                  >
                    {event.status === 'OPEN' ? t('statusOpen') : t('statusClosed')}
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-[#101C32] mt-1 tracking-tight">
                  {event.topic}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
                  <span className="inline-flex items-center gap-1.5 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="text-slate-500">{t('fieldTime')}:</span>
                    <strong className="font-semibold text-[#101C32]">{event.event_time}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="text-slate-500">{t('fieldLocation')}:</span>
                    <strong className="font-semibold text-[#101C32]">{event.location}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left md:text-right shrink-0 space-y-1">
              <span className="text-[11px] text-slate-500 font-mono block">
                {t('generatedLabel')}: {formatDate(generatedAt)}
              </span>
              <span className="text-[11px] text-slate-500 font-mono block">
                {t('token')}:{' '}
                <code className="text-[#101C32] bg-slate-100 px-1.5 py-0.5 rounded font-bold font-mono">
                  {event.registration_token}
                </code>
              </span>
            </div>
          </div>

          {/* Statistics Summary Bar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {t('summaryBreakdown')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-[#101C32] text-white rounded-2xl shadow-xs">
                <span className="text-[10px] font-semibold text-blue-300 uppercase">
                  {t('totalPlayers')}
                </span>
                <div className="text-2xl font-extrabold mt-0.5 tabular-nums">
                  {stats.totalPlayers}
                </div>
                <span className="text-[10px] text-slate-300 font-medium">{t('registeredRoster')}</span>
              </div>

              {['A', 'B', 'C'].map((letter) => {
                const team = teamMap[letter];
                const count =
                  letter === 'A'
                    ? stats.teamAPlayers
                    : letter === 'B'
                      ? stats.teamBPlayers
                      : stats.teamCPlayers;
                const labelKey =
                  letter === 'A'
                    ? 'teamAPlayers'
                    : letter === 'B'
                      ? 'teamBPlayers'
                      : 'teamCPlayers';

                return (
                  <div
                    key={letter}
                    className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        {t(labelKey)}
                      </span>
                      <div className="text-xl font-bold text-[#101C32] mt-0.5 tabular-nums">
                        {count}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {team.team_name}
                      </span>
                    </div>
                    {team.logo_url ? (
                      <ImageWithFallback
                        src={team.logo_url}
                        alt={team.team_name}
                        className="w-8 h-8 object-cover border border-slate-200 shrink-0"
                        rounded="rounded-lg"
                        iconSize="w-4 h-4"
                      />
                    ) : (
                      <span
                        className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: team.team_color }}
                      >
                        {letter}
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  {t('colStatus')}
                </span>
                <div
                  className={`text-lg font-extrabold mt-0.5 ${
                    event.status === 'OPEN' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                  }`}
                >
                  {event.status}
                </div>
                <span className="text-[11px] text-slate-500">
                  {event.status === 'OPEN' ? t('statusOpen') : t('statusClosed')}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Team Filter Toolbar */}
          <div className="no-print pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchPlayerPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200">
              {['ALL', 'A', 'B', 'C'].map((key) => {
                const isActive = teamFilter === key;
                const activeBg =
                  key === 'ALL'
                    ? 'bg-[#101C32] text-white'
                    : key === 'A'
                      ? 'bg-[#2563EB] text-white'
                      : key === 'B'
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-[#16A34A] text-white';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTeamFilter(key)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive ? `${activeBg} shadow-2xs` : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {key === 'ALL' ? t('allTeams') : `Team ${key}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 SEPARATE TEAM SECTIONS */}
          <div className="space-y-6">
            {['A', 'B', 'C'].map((letter) => {
              if (teamFilter !== 'ALL' && teamFilter !== letter) return null;

              const team = teamMap[letter];
              const teamRegs = filteredRegs
                .filter((r) => r.team_letter === letter)
                .sort((a, b) => a.name.localeCompare(b.name));

              return (
                <div
                  key={letter}
                  className="print-break-inside-avoid rounded-2xl border border-slate-200 overflow-hidden shadow-2xs bg-white"
                >
                  {/* Team Banner Header */}
                  <div
                    className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white"
                    style={{ backgroundColor: team.team_color || '#2563EB' }}
                  >
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <ImageWithFallback
                          src={team.logo_url}
                          alt={team.team_name}
                          className="w-10 h-10 object-cover border-2 border-white/40 bg-white/10 shrink-0"
                          rounded="rounded-xl"
                          iconSize="w-5 h-5"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center font-bold text-sm shrink-0">
                          {letter}
                        </span>
                      )}
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">
                          {team.team_name}
                        </h3>
                        <p className="text-[11px] opacity-90">
                          {t('fieldCaptainName')}:{' '}
                          <span className="font-semibold">{team.captain_name || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs bg-black/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                      <span>
                        {t('totalPlayers')}: <strong className="font-bold">{teamRegs.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Mobile Card List */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {teamRegs.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-400 italic">
                        {t('noPlayersRegisteredYet')}
                      </div>
                    ) : (
                      teamRegs.map((reg, idx) => {
                        const normName = reg.normalized_name || normalizeName(reg.name);
                        const isDuplicateName = (nameOccurrences[normName] || 0) > 1;
                        const pNo = reg.player_no || reg.number_of_players || '—';
                        const normNo = reg.player_no_norm || normalizePlayerNo(pNo);
                        const isDuplicateNo = (noOccurrences[normNo] || 0) > 1;

                        return (
                          <div key={reg.id} className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0">
                                {idx + 1}.
                              </span>
                              {reg.avatar_url ? (
                                <ImageWithFallback
                                  src={reg.avatar_url}
                                  alt={reg.name}
                                  className="w-9 h-9 object-cover border border-slate-200 shrink-0"
                                  rounded="rounded-full"
                                  iconSize="w-4 h-4"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#101C32] truncate">
                                    {reg.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] font-mono font-bold text-[11px] border border-blue-200">
                                    #{pNo}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[10px] text-slate-400">
                                    {formatDate(reg.created_at)}
                                  </span>
                                  {isDuplicateName && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      {t('duplicateNameTag')}
                                    </span>
                                  )}
                                  {isDuplicateNo && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-[#DC2626] border border-red-200">
                                      {t('duplicateNoTag')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="no-print flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(reg)}
                                className="p-2 text-slate-500 hover:text-[#2563EB] rounded-lg hover:bg-blue-50"
                                title={t('btnEdit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRegistration(reg)}
                                className="p-2 text-red-400 hover:text-[#DC2626] rounded-lg hover:bg-red-50"
                                title={t('btnDelete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-4 w-12 text-center">{t('colNo')}</th>
                          <th className="py-2.5 px-4">{t('playerNameLabel')}</th>
                          <th className="py-2.5 px-4 text-center">{t('playerNoLabel')}</th>
                          <th className="py-2.5 px-4">{t('rosterRegisteredAt')}</th>
                          <th className="no-print py-2.5 px-4 text-right">{t('colActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {teamRegs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                              {t('noPlayersRegisteredYet')}
                            </td>
                          </tr>
                        ) : (
                          teamRegs.map((reg, idx) => {
                            const normName = reg.normalized_name || normalizeName(reg.name);
                            const isDuplicateName = (nameOccurrences[normName] || 0) > 1;

                            const pNo = reg.player_no || reg.number_of_players || '—';
                            const normNo = reg.player_no_norm || normalizePlayerNo(pNo);
                            const isDuplicateNo = (noOccurrences[normNo] || 0) > 1;

                            return (
                              <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 text-center font-mono text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {reg.avatar_url ? (
                                      <ImageWithFallback
                                        src={reg.avatar_url}
                                        alt={reg.name}
                                        className="w-8 h-8 object-cover border border-slate-200 shrink-0"
                                        rounded="rounded-full"
                                        iconSize="w-3.5 h-3.5"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                    <span className="font-semibold text-[#101C32]">{reg.name}</span>
                                    {isDuplicateName && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                        title={t('duplicateNameTag')}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        {t('duplicateNameTag')}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center font-mono">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md font-bold text-[#2563EB] text-xs">
                                    #{pNo}
                                  </div>
                                  {isDuplicateNo && (
                                    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-[#DC2626] border border-red-200">
                                      {t('duplicateNoTag')}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {formatDate(reg.created_at)}
                                </td>
                                <td className="no-print py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(reg)}
                                      className="p-1.5 text-slate-500 hover:text-[#2563EB] rounded-lg hover:bg-blue-50 transition-colors"
                                      title={t('btnEdit')}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRegistration(reg)}
                                      className="p-1.5 text-red-400 hover:text-[#DC2626] rounded-lg hover:bg-red-50 transition-colors"
                                      title={t('btnDelete')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#F8FAFC] border-t border-slate-200 font-bold text-[#101C32]">
                          <td colSpan={2} className="py-3 px-4 text-right">
                            {t('teamTotal')} (Team {letter}):
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-sm text-[#2563EB]">
                            {teamRegs.length} {t('playersSuffix')}
                          </td>
                          <td colSpan={2} className="py-3 px-4 text-slate-500 text-[11px] font-normal">
                            {t('registeredRoster')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total Footer */}
          <div className="p-5 rounded-2xl bg-[#101C32] text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="text-sm font-bold">{t('overallSummary')}</h4>
              <p className="text-xs text-slate-300">
                {t('brandName')} • {event.topic}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center sm:text-right">
                <span className="text-[10px] uppercase text-blue-300 font-semibold block">
                  {t('totalPlayers')}
                </span>
                <span className="text-2xl font-extrabold font-mono text-white">
                  {stats.totalPlayers}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        event={event}
      />

      {/* Edit Registration Modal */}
      {editingReg && (
        <Modal
          isOpen={Boolean(editingReg)}
          onClose={() => setEditingReg(null)}
          title={t('editPlayerTitle')}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <ImageUploader
              label={t('playerAvatarOptional')}
              value={editFormData.avatar_url}
              onChange={(url) => setEditFormData((prev) => ({ ...prev, avatar_url: url }))}
              folder="avatars"
              variant="avatar"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('playerNameLabel')}
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('playerNoLabel')}
              </label>
              <input
                type="text"
                value={editFormData.player_no}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, player_no: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
                placeholder="e.g. 7 or 10 or 23"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('selectTeamLabel')}
              </label>
              <select
                value={editFormData.team_letter}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, team_letter: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-hidden"
              >
                <option value="A">Team A ({teamMap['A']?.team_name})</option>
                <option value="B">Team B ({teamMap['B']?.team_name})</option>
                <option value="C">Team C ({teamMap['C']?.team_name})</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingReg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                {t('btnCancel')}
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-xl shadow-xs"
              >
                {t('btnSaveChanges')}
              </button>
            </div>
          </form>
        </Modal>
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
      />
    </div>
  );
}
