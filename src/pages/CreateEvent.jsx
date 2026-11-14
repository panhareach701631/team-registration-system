import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import QrCodeModal from '../components/QrCodeModal';
import ImageUploader from '../components/ImageUploader';
import ImageWithFallback from '../components/ImageWithFallback';
import DateTimePickerField from '../components/DateTimePickerField';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Eye,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#2563EB', // Blue
  '#DC2626', // Red
  '#16A34A', // Green
  '#101C32', // Navy
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#DB2777', // Pink
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const [formData, setFormData] = useState({
    topic: '',
    event_time: '',
    location: '',
    cover_image_url: '/images/club-pitch.jpg',
  });

  const [teams, setTeams] = useState([
    {
      team_letter: 'A',
      team_name: 'Team A',
      captain_name: '',
      team_color: '#2563EB',
      logo_url: '/images/team-blue.jpg',
    },
    {
      team_letter: 'B',
      team_name: 'Team B',
      captain_name: '',
      team_color: '#DC2626',
      logo_url: '/images/team-red.jpg',
    },
    {
      team_letter: 'C',
      team_name: 'Team C',
      captain_name: '',
      team_color: '#16A34A',
      logo_url: '/logo.jpg',
    },
  ]);

  const [errors, setErrors] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  const handleTeamChange = (index, field, value) => {
    setTeams((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validate = () => {
    const errs = {};
    if (!formData.topic.trim()) errs.topic = t('errFieldRequired');
    if (!formData.event_time.trim()) errs.event_time = t('errFieldRequired');
    if (!formData.location.trim()) errs.location = t('errFieldRequired');

    teams.forEach((team, idx) => {
      if (!team.captain_name.trim()) {
        errs[`captain_${idx}`] = t('errFieldRequired');
      }
    });

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(t('errFieldRequired'));
    }
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const newEvent = await db.createEvent({
        topic: formData.topic.trim(),
        event_time: formData.event_time.trim(),
        location: formData.location.trim(),
        cover_image_url: formData.cover_image_url,
        teams,
      });
      toast.success(t('eventCreatedToast'));
      setCreatedEvent(newEvent);
    } catch (err) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
      setIsPreviewOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#101C32] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#2563EB]" />
          <span>{t('backToDashboard')}</span>
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#101C32]">
          {t('createEventTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('createEventSubtitle')}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (validate()) setIsPreviewOpen(true);
        }}
        className="space-y-6"
      >
        {/* Section 1: Event Details + Cover Image */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-bold text-[#101C32] uppercase tracking-wider">
              {t('sectionEventInfo')}
            </h2>
          </div>

          <ImageUploader
            label={t('fieldCoverImage')}
            value={formData.cover_image_url}
            onChange={(url) => setFormData({ ...formData, cover_image_url: url })}
            folder="events"
            variant="cover"
            showPresets
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="md:col-span-2">
              <label htmlFor="topic" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('fieldTopic')} <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="topic"
                type="text"
                placeholder={t('fieldTopicPlaceholder')}
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 px-3.5 text-xs text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
                  errors.topic ? 'border-[#DC2626]' : 'border-slate-200 focus:border-[#2563EB]'
                }`}
              />
              {errors.topic && (
                <p className="mt-1 text-[11px] text-[#DC2626] font-medium">{errors.topic}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <DateTimePickerField
                idPrefix="create"
                value={formData.event_time}
                onChange={(val) => setFormData({ ...formData, event_time: val })}
                error={errors.event_time}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('fieldLocation')} <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="location"
                  type="text"
                  placeholder={t('fieldLocationPlaceholder')}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-9 pr-3.5 text-xs text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
                    errors.location ? 'border-[#DC2626]' : 'border-slate-200 focus:border-[#2563EB]'
                  }`}
                />
              </div>
              {errors.location && (
                <p className="mt-1 text-[11px] text-[#DC2626] font-medium">{errors.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Team A, B, C Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-bold text-[#101C32] uppercase tracking-wider">
              {t('sectionTeamInfo')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {teams.map((team, idx) => (
              <div
                key={team.team_letter}
                className="p-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-4"
                style={{ borderTop: `4px solid ${team.team_color}` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase text-[#101C32]">
                    Team {team.team_letter}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold px-2 py-0.5 bg-white rounded border border-slate-200">
                    {team.team_color}
                  </span>
                </div>

                <ImageUploader
                  label={t('fieldTeamLogo')}
                  value={team.logo_url}
                  onChange={(url) => handleTeamChange(idx, 'logo_url', url)}
                  folder="teams"
                  variant="logo"
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {t('fieldTeamName')}
                  </label>
                  <input
                    type="text"
                    value={team.team_name}
                    onChange={(e) => handleTeamChange(idx, 'team_name', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {t('fieldCaptainName')} <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={team.captain_name}
                    onChange={(e) => handleTeamChange(idx, 'captain_name', e.target.value)}
                    placeholder={t('fieldCaptainPlaceholder')}
                    className={`w-full rounded-xl border bg-white py-2 px-3 text-xs text-[#101C32] focus:outline-hidden font-medium ${
                      errors[`captain_${idx}`]
                        ? 'border-[#DC2626]'
                        : 'border-slate-200 focus:border-[#2563EB]'
                    }`}
                  />
                  {errors[`captain_${idx}`] && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">{errors[`captain_${idx}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    {t('fieldTeamColor')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={team.team_color}
                      onChange={(e) => handleTeamChange(idx, 'team_color', e.target.value)}
                      aria-label={`Color picker for Team ${team.team_letter}`}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white shrink-0"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleTeamChange(idx, 'team_color', color)}
                          aria-label={`Select color ${color}`}
                          className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                            team.team_color === color
                              ? 'scale-110 ring-2 ring-[#101C32] border-white'
                              : 'border-black/15'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t('btnCancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (validate()) setIsPreviewOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#101C32] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#2563EB]" />
            <span>{t('btnPreviewEvent')}</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{t('btnCreatePublish')}</span>
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={t('previewTitle')}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl bg-[#101C32] text-white border border-slate-200">
            <ImageWithFallback
              src={formData.cover_image_url}
              fallbackSrc="/images/club-pitch.jpg"
              alt={formData.topic}
              rounded="rounded-none"
              className="w-full h-44 opacity-50"
            />
            <div className="absolute inset-0 bg-[#101C32]/55 p-6 flex flex-col justify-end text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">
                {t('btnPreviewEvent')}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">{formData.topic}</h3>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  {formData.event_time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  {formData.location}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#101C32] uppercase tracking-wider mb-3">
              {t('configuredTeams')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {teams.map((team) => (
                <div
                  key={team.team_letter}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center gap-3"
                  style={{ borderTop: `4px solid ${team.team_color}` }}
                >
                  <ImageWithFallback
                    src={team.logo_url}
                    fallbackText={team.team_letter}
                    alt={team.team_name}
                    rounded="rounded-full"
                    className="w-10 h-10 shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#101C32] truncate">{team.team_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {t('fieldCaptainName')}: <span className="font-semibold text-slate-700">{team.captain_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              {t('btnBackToEdit')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {t('btnConfirmPublish')}
            </button>
          </div>
        </div>
      </Modal>

      {createdEvent && (
        <QrCodeModal
          isOpen={Boolean(createdEvent)}
          onClose={() => {
            setCreatedEvent(null);
            navigate('/admin/dashboard');
          }}
          event={createdEvent}
        />
      )}
    </div>
  );
}
