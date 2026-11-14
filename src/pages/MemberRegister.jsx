import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import LanguageToggle from '../components/LanguageToggle';
import ImageUploader from '../components/ImageUploader';
import ImageWithFallback from '../components/ImageWithFallback';
import TeamSlideshow from '../components/TeamSlideshow';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  User,
  Hash,
  ListOrdered,
  UserPlus,
  Search,
} from 'lucide-react';
import { formatDate } from '../utils/formatting';

export default function MemberRegister() {
  const { token } = useParams();
  const { t } = useLanguage();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // 'NOT_FOUND' | 'CLOSED'

  const [activeTab, setActiveTab] = useState('REGISTER');
  const [rosterTeamFilter, setRosterTeamFilter] = useState('ALL');
  const [rosterSearch, setRosterSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    player_no: '',
    team_letter: '',
    avatar_url: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const fetchEventData = useCallback(async () => {
    const foundEvent = await db.getEventByToken(token);
    if (!foundEvent) {
      return { foundEvent: null, status: 'NOT_FOUND' };
    }
    return {
      foundEvent,
      status: foundEvent.status !== 'OPEN' ? 'CLOSED' : null,
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { foundEvent, status } = await fetchEventData();
        if (!active) return;
        setErrorStatus(status);
        setEvent(foundEvent);
        if (foundEvent?.teams?.length > 0) {
          setFormData((prev) =>
            prev.team_letter ? prev : { ...prev, team_letter: foundEvent.teams[0].team_letter }
          );
        }
      } catch (err) {
        console.error('Failed to load event:', err);
        if (active) setErrorStatus('NOT_FOUND');
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [fetchEventData]);

  const validateForm = () => {
    const errs = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      errs.name = `${t('playerNameLabel')} — ${t('errFieldRequired')}`;
    } else if (trimmedName.length < 2) {
      errs.name = 'Name must be at least 2 characters long';
    }

    const trimmedPlayerNo = formData.player_no.trim();
    if (!trimmedPlayerNo) {
      errs.player_no = `${t('playerNoLabel')} — ${t('errFieldRequired')}`;
    }

    if (!formData.team_letter || !['A', 'B', 'C'].includes(formData.team_letter)) {
      errs.team_letter = `${t('selectTeamLabel')} — ${t('errFieldRequired')}`;
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await db.submitRegistration({
        token,
        team_letter: formData.team_letter,
        name: formData.name.trim(),
        player_no: formData.player_no.trim(),
        avatar_url: formData.avatar_url || '',
      });

      if (res.success) {
        setSubmissionSuccess({
          ...res,
          created_at: res.created_at || new Date().toISOString(),
        });
        toast.success(t('registrationSuccessTitle'));
        const refreshed = await fetchEventData();
        if (refreshed.foundEvent) {
          setEvent(refreshed.foundEvent);
          setErrorStatus(refreshed.status);
        }
      } else {
        const msg = res.error || 'Failed to submit registration. Please try again.';
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || 'An unexpected error occurred during submission.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setSubmissionSuccess(null);
    setFormData({
      name: '',
      player_no: '',
      team_letter: event?.teams?.[0]?.team_letter || 'A',
      avatar_url: '',
    });
    setFieldErrors({});
    setSubmitError('');
    setActiveTab('REGISTER');
  };

  // 1. Loading State
  if (loading && !event) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading event...</p>
        </div>
      </div>
    );
  }

  // 2. Event Not Found State
  if (errorStatus === 'NOT_FOUND') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#101C32]">{t('eventNotFoundTitle')}</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {t('eventNotFoundDesc')}
          </p>
        </div>
      </div>
    );
  }

  // 3. Event Closed State (with read-only team roster preview)
  if (errorStatus === 'CLOSED' || event?.status === 'CLOSED') {
    const teams = event?.teams || [];
    const registrations = event?.registrations || [];

    return (
      <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 text-[#101C32]">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white px-4 sm:px-5 py-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo.jpg"
                alt="Khmer Team One"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#2563EB]/30 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-[#101C32] block truncate">
                  {t('brandName')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {t('systemTitle')}
                </span>
              </div>
            </div>
            <LanguageToggle />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="relative h-40 bg-[#101C32]">
              <ImageWithFallback
                src={event?.cover_image_url}
                fallbackSrc="/images/club-pitch.jpg"
                alt={event?.topic}
                rounded="rounded-none"
                className="w-full h-full opacity-50"
              />
              <div className="absolute inset-0 bg-[#101C32]/60 flex flex-col items-center justify-center p-6 text-center text-white">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DC2626] text-white mb-2">
                  <Lock className="w-3 h-3" />
                  {t('statusClosed')}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold">{event?.topic}</h1>
              </div>
            </div>
            <div className="p-6 text-center space-y-2">
              <h2 className="text-base font-bold text-[#101C32]">
                {t('registrationClosedTitle')}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                {t('registrationClosedDesc')}
              </p>
            </div>
          </div>

          {/* Read-Only Roster Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#101C32]">{t('liveRosterTitle')}</h3>
              <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {registrations.length} {t('playersCountLabel')}
              </span>
            </div>
            <div className="space-y-4">
              {teams.map((tm) => {
                const teamRegs = registrations.filter((r) => r.team_letter === tm.team_letter);
                return (
                  <div key={tm.team_letter} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div
                      className="px-4 py-2.5 text-white font-bold text-xs flex justify-between items-center"
                      style={{ backgroundColor: tm.team_color }}
                    >
                      <div className="flex items-center gap-2">
                        {tm.logo_url && (
                          <img
                            src={tm.logo_url}
                            alt={tm.team_name}
                            className="w-6 h-6 rounded-full object-cover border border-white/40"
                          />
                        )}
                        <span>{tm.team_name} (Team {tm.team_letter})</span>
                      </div>
                      <span className="text-[11px] font-mono bg-black/20 px-2 py-0.5 rounded">
                        {teamRegs.length} {t('playersCountLabel')}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC]">
                      {teamRegs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">{t('noPlayersRegisteredYet')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {teamRegs.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#101C32]"
                            >
                              <ImageWithFallback
                                src={p.avatar_url}
                                fallbackText={p.name}
                                alt={p.name}
                                rounded="rounded-full"
                                className="w-5 h-5 text-[9px]"
                              />
                              <span className="font-mono text-[#2563EB] font-bold">#{p.player_no}</span>
                              <span>{p.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Successful Submission Confirmation State
  if (submissionSuccess) {
    const selectedTeam = event?.teams?.find((tm) => tm.team_letter === submissionSuccess.team_letter);

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 text-[#101C32]">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/logo.jpg"
              alt="Khmer Team One"
              className="w-14 h-14 rounded-full object-cover border-2 border-[#2563EB]/30 shadow-xs"
            />
            {submissionSuccess.avatar_url && (
              <ImageWithFallback
                src={submissionSuccess.avatar_url}
                fallbackText={submissionSuccess.name}
                alt={submissionSuccess.name}
                rounded="rounded-full"
                className="w-14 h-14 border-2 border-[#16A34A] shadow-xs"
              />
            )}
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#16A34A] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {t('registrationConfirmedTitle')}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#101C32] mt-2">
              {t('registrationSuccessTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t('registrationSuccessSubtitle')}</p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 text-left space-y-3">
            <div className="pb-2.5 border-b border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                {t('fieldTopic')}
              </span>
              <span className="text-xs font-bold text-[#101C32]">{event.topic}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  {t('playerNameLabel')}
                </span>
                <span className="text-xs font-bold text-[#101C32]">{submissionSuccess.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  {t('playerNoLabel')}
                </span>
                <div className="inline-flex items-center mt-0.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-xs font-bold font-mono text-[#2563EB]">
                  #{submissionSuccess.player_no}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  {t('selectTeamLabel')}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedTeam?.team_color || '#2563EB' }}
                  />
                  <span className="text-xs font-bold text-[#101C32]">
                    {selectedTeam?.team_name || `Team ${submissionSuccess.team_letter}`}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  {t('rosterRegisteredAt')}
                </span>
                <span className="text-xs font-medium text-slate-600">
                  {formatDate(submissionSuccess.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setSubmissionSuccess(null);
                setActiveTab('ROSTER');
              }}
              className="w-full py-3 px-4 text-xs font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              {t('tabViewRosters')}
            </button>
            <button
              type="button"
              onClick={handleRegisterAnother}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-[#101C32] hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {t('btnRegisterAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Active Public Member Registration View
  const teams = event?.teams || [];
  const registrations = event?.registrations || [];

  const takenNumbersByTeam = {};
  ['A', 'B', 'C'].forEach((letter) => {
    takenNumbersByTeam[letter] = registrations
      .filter((r) => r.team_letter === letter)
      .map((r) => r.player_no);
  });

  const filteredRoster = registrations.filter((r) => {
    const matchesTeam = rosterTeamFilter === 'ALL' || r.team_letter === rosterTeamFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      String(r.player_no).includes(rosterSearch);
    return matchesTeam && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 text-[#101C32]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Bar with Preserved Club Logo + Language Switcher */}
        <div className="flex items-center justify-between gap-3 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#2563EB]/30 shadow-xs shrink-0 bg-[#101C32]">
              <img
                src="/logo.jpg"
                alt="ក្រុមខ្មែរតែមួយ - Khmer Team One"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-extrabold text-[#101C32] leading-tight block truncate">
                {t('brandName')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-tight block truncate">
                {t('systemTitle')}
              </span>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* Event Cover Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="relative h-48 sm:h-60 w-full bg-[#101C32]">
            <ImageWithFallback
              src={event.cover_image_url}
              fallbackSrc="/images/club-pitch.jpg"
              alt={event.topic}
              rounded="rounded-none"
              className="w-full h-full opacity-55"
            />
            <div className="absolute inset-0 bg-[#101C32]/55 p-5 sm:p-8 flex flex-col items-center justify-center text-center text-white space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#16A34A] text-white shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {t('statusOpen')}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug max-w-2xl">
                {event.topic}
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-100">
                <div className="flex items-center gap-1.5 bg-[#101C32]/75 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{event.event_time}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#101C32]/75 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Competing Teams Strip */}
          <div className="p-4 sm:p-6 bg-white">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
              {t('competingTeams')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {teams.map((team) => {
                const count = registrations.filter((r) => r.team_letter === team.team_letter).length;
                return (
                  <div
                    key={team.team_letter}
                    className="rounded-xl border border-slate-200 p-3 bg-[#F8FAFC] flex items-center gap-3"
                    style={{ borderLeft: `4px solid ${team.team_color}` }}
                  >
                    <ImageWithFallback
                      src={team.logo_url}
                      fallbackText={team.team_letter}
                      alt={team.team_name}
                      rounded="rounded-full"
                      className="w-10 h-10 shrink-0 border border-slate-200 text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#101C32] truncate">
                          {team.team_name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white rounded border border-slate-200 text-[#2563EB] shrink-0">
                          {count}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {t('fieldCaptainName')}: <strong className="text-slate-700">{team.captain_name || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Team Slideshow */}
        <TeamSlideshow
          teams={teams}
          coverImage={event.cover_image_url}
          eventTitle={event.topic}
          compact
        />

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-xl max-w-md mx-auto text-xs font-bold border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('REGISTER')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'bg-[#101C32] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101C32]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('tabRegisterNow')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROSTER')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ROSTER'
                ? 'bg-[#101C32] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101C32]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>{t('tabViewRosters')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'ROSTER'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {registrations.length}
            </span>
          </button>
        </div>

        {/* TAB 1: REGISTRATION FORM */}
        {activeTab === 'REGISTER' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#101C32]">
                {t('playerRegistrationForm')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('playerRegistrationSubtitle')}</p>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-[#DC2626] text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Player Avatar Upload (Optional) */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <ImageUploader
                  label={t('playerPhotoLabel')}
                  value={formData.avatar_url}
                  onChange={(url) => setFormData({ ...formData, avatar_url: url })}
                  folder="players"
                  registrationToken={token}
                  variant="avatar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Player Name */}
                <div>
                  <label htmlFor="player-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('playerNameLabel')} <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="player-name"
                      type="text"
                      placeholder={t('playerNamePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-10 pr-3.5 text-xs text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
                        fieldErrors.name
                          ? 'border-[#DC2626]'
                          : 'border-slate-200 focus:border-[#2563EB]'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="mt-1 text-[11px] text-[#DC2626] font-medium">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Field 2: Player Number */}
                <div>
                  <label htmlFor="player-no" className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('playerNoLabel')} <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="player-no"
                      type="text"
                      placeholder={t('playerNoPlaceholder')}
                      value={formData.player_no}
                      onChange={(e) => setFormData({ ...formData, player_no: e.target.value })}
                      className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-10 pr-3.5 text-xs text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:bg-white transition-colors font-mono ${
                        fieldErrors.player_no
                          ? 'border-[#DC2626]'
                          : 'border-slate-200 focus:border-[#2563EB]'
                      }`}
                    />
                  </div>
                  {fieldErrors.player_no ? (
                    <p className="mt-1 text-[11px] text-[#DC2626] font-medium">{fieldErrors.player_no}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400">{t('playerNoHelp')}</p>
                  )}
                </div>
              </div>

              {/* Field 3: Select Team (Visual Cards) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('selectTeamLabel')} <span className="text-[#DC2626]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ROSTER')}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {t('tabViewRosters')} →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {teams.map((team) => {
                    const isSelected = formData.team_letter === team.team_letter;
                    const taken = takenNumbersByTeam[team.team_letter] || [];

                    return (
                      <button
                        type="button"
                        key={team.team_letter}
                        onClick={() => setFormData({ ...formData, team_letter: team.team_letter })}
                        className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#101C32] text-white shadow-md ring-2 ring-[#2563EB]'
                            : 'border-slate-200 bg-[#F8FAFC] hover:border-[#2563EB]/50 hover:bg-white text-[#101C32]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <ImageWithFallback
                            src={team.logo_url}
                            fallbackText={team.team_letter}
                            alt={team.team_name}
                            rounded="rounded-full"
                            className="w-9 h-9 border border-white/30 text-xs"
                          />
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/40"
                              style={{ backgroundColor: team.team_color }}
                            />
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                isSelected ? 'text-blue-300' : 'text-slate-500'
                              }`}
                            >
                              Team {team.team_letter}
                            </span>
                          </div>
                        </div>

                        <div className="font-bold text-xs truncate">{team.team_name}</div>
                        <div
                          className={`text-[11px] mt-0.5 truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {t('fieldCaptainName')}: {team.captain_name || 'N/A'}
                        </div>

                        <div className="mt-3 pt-2 border-t border-black/10 text-[10px]">
                          <span className={isSelected ? 'text-blue-300 font-semibold' : 'text-[#2563EB] font-semibold'}>
                            {taken.length} {t('playersCountLabel')}
                          </span>
                          {taken.length > 0 && (
                            <span
                              className={`block truncate mt-0.5 font-mono ${
                                isSelected ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              {t('alreadyTakenNumbers')}: #{taken.slice(0, 4).join(', #')}
                              {taken.length > 4 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.team_letter && (
                  <p className="mt-1.5 text-[11px] text-[#DC2626]">{fieldErrors.team_letter}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#2563EB] hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('submittingRegistration')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('btnSubmitRegistration')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: LIVE READ-ONLY ROSTER PREVIEW */}
        {activeTab === 'ROSTER' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#101C32]">{t('liveRosterTitle')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('liveRosterSubtitle')}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('REGISTER')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-2xs self-start sm:self-auto transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t('tabRegisterNow')}</span>
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('searchPlayerPlaceholder')}
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  aria-label={t('searchPlayerPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-[#F8FAFC] text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200">
                {[
                  { key: 'ALL', label: t('allTeams') },
                  { key: 'A', label: 'Team A' },
                  { key: 'B', label: 'Team B' },
                  { key: 'C', label: 'Team C' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRosterTeamFilter(opt.key)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      rosterTeamFilter === opt.key
                        ? 'bg-[#101C32] text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-[#101C32]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Roster Blocks */}
            <div className="space-y-6">
              {['A', 'B', 'C'].map((letter) => {
                if (rosterTeamFilter !== 'ALL' && rosterTeamFilter !== letter) return null;

                const team = teams.find((tm) => tm.team_letter === letter) || {
                  team_letter: letter,
                  team_name: `Team ${letter}`,
                  team_color: letter === 'A' ? '#2563EB' : letter === 'B' ? '#DC2626' : '#16A34A',
                  logo_url: '',
                };

                const teamRegs = filteredRoster
                  .filter((r) => r.team_letter === letter)
                  .sort((a, b) => a.name.localeCompare(b.name));

                return (
                  <div key={letter} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div
                      className="px-4 py-3 text-white flex items-center justify-between gap-2"
                      style={{ backgroundColor: team.team_color }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.team_name}
                            className="w-7 h-7 rounded-full object-cover border border-white/40 shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {letter}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs block truncate">{team.team_name}</span>
                          <span className="text-[10px] opacity-85 block truncate">
                            {t('fieldCaptainName')}: {team.captain_name || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-black/20 px-2.5 py-0.5 rounded-md shrink-0">
                        {teamRegs.length} {t('playersCountLabel')}
                      </span>
                    </div>

                    {/* Mobile Cards (< sm) */}
                    <div className="sm:hidden divide-y divide-slate-100 bg-white">
                      {teamRegs.length === 0 ? (
                        <p className="py-5 px-4 text-center text-xs text-slate-400 italic">
                          {t('noPlayersRegisteredYet')}
                        </p>
                      ) : (
                        teamRegs.map((reg, idx) => (
                          <div key={reg.id} className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0">
                                {idx + 1}.
                              </span>
                              <ImageWithFallback
                                src={reg.avatar_url}
                                fallbackText={reg.name}
                                alt={reg.name}
                                rounded="rounded-full"
                                className="w-9 h-9 shrink-0 text-xs"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#101C32] truncate">
                                  {reg.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {formatDate(reg.created_at)}
                                </div>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[#2563EB] font-bold font-mono text-xs rounded-md shrink-0">
                              #{reg.player_no}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                            <th className="py-2.5 px-4 w-12 text-center">{t('colNo')}</th>
                            <th className="py-2.5 px-4">{t('playerNameLabel')}</th>
                            <th className="py-2.5 px-4 text-center">{t('playerNoLabel')}</th>
                            <th className="py-2.5 px-4 text-right">{t('rosterRegisteredAt')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {teamRegs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-5 text-center text-slate-400 italic">
                                {t('noPlayersRegisteredYet')}
                              </td>
                            </tr>
                          ) : (
                            teamRegs.map((reg, idx) => (
                              <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <ImageWithFallback
                                      src={reg.avatar_url}
                                      fallbackText={reg.name}
                                      alt={reg.name}
                                      rounded="rounded-full"
                                      className="w-8 h-8 shrink-0 text-[10px]"
                                    />
                                    <span className="font-semibold text-[#101C32]">{reg.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-center font-mono">
                                  <span className="inline-block px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[#2563EB] font-bold rounded-md">
                                    #{reg.player_no}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right text-slate-500">
                                  {formatDate(reg.created_at)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
