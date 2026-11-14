import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import ImageUploader from '../components/ImageUploader';
import DateTimePickerField from '../components/DateTimePickerField';
import { Calendar, MapPin, Users, ArrowLeft, Save } from 'lucide-react';

const COLOR_PRESETS = [
  '#2563EB', '#DC2626', '#16A34A', '#101C32',
  '#7C3AED', '#D97706', '#0891B2', '#DB2777',
];

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    event_time: '',
    location: '',
    cover_image_url: '',
  });
  const [teams, setTeams] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    async function loadEvent() {
      try {
        const event = await db.getEventById(id);
        if (!active) return;

        if (!event) {
          toast.error(t('eventNotFoundTitle'));
          navigate('/admin/dashboard');
          return;
        }

        setFormData({
          topic: event.topic || '',
          event_time: event.event_time || '',
          location: event.location || '',
          cover_image_url: event.cover_image_url || '',
        });

        const letters = ['A', 'B', 'C'];
        const formattedTeams = letters.map((letter) => {
          const existing = (event.teams || []).find((tm) => tm.team_letter === letter);
          return (
            existing || {
              team_letter: letter,
              team_name: `Team ${letter}`,
              captain_name: '',
              team_color: letter === 'A' ? '#2563EB' : letter === 'B' ? '#DC2626' : '#16A34A',
              logo_url: '',
            }
          );
        });

        setTeams(formattedTeams);
      } catch (err) {
        console.error('Error loading event:', err);
        if (active) toast.error(err.message || 'Failed to load event');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadEvent();
    return () => {
      active = false;
    };
  }, [id, navigate, t, toast]);

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
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await db.updateEvent(id, {
        topic: formData.topic.trim(),
        event_time: formData.event_time.trim(),
        location: formData.location.trim(),
        cover_image_url: formData.cover_image_url,
        teams,
      });
      toast.success(t('eventUpdatedToast'));
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading event details...
      </div>
    );
  }

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
          {t('editEventTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('editEventSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <label htmlFor="edit-topic" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('fieldTopic')} <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="edit-topic"
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 px-3.5 text-xs text-[#101C32] focus:outline-hidden focus:bg-white font-medium ${
                  errors.topic ? 'border-[#DC2626]' : 'border-slate-200 focus:border-[#2563EB]'
                }`}
              />
              {errors.topic && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.topic}</p>}
            </div>

            <div className="md:col-span-2">
              <DateTimePickerField
                idPrefix="edit"
                value={formData.event_time}
                onChange={(val) => setFormData({ ...formData, event_time: val })}
                error={errors.event_time}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="edit-location" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('fieldLocation')} <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-9 pr-3.5 text-xs text-[#101C32] focus:outline-hidden focus:bg-white font-medium ${
                    errors.location ? 'border-[#DC2626]' : 'border-slate-200 focus:border-[#2563EB]'
                  }`}
                />
              </div>
              {errors.location && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.location}</p>}
            </div>
          </div>
        </div>

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
                  value={team.logo_url || ''}
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{t('btnSaveChanges')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
