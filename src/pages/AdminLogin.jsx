import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { ShieldCheck, Eye, EyeOff, ArrowRight, AlertCircle, Database, Trophy } from 'lucide-react';
import { db } from '../services/db';
import LanguageToggle from '../components/LanguageToggle';

export default function AdminLogin() {
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!accessCode.trim()) {
      setError(t('errEnterCode'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(accessCode.trim());
      if (res.success) {
        toast.success(t('adminSession') + ' ✓');
        navigate('/admin/dashboard');
      } else {
        setError(res.error || t('errInvalidCode'));
      }
    } catch {
      setError(t('errConnection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101C32] relative flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Real Football Club Pitch Background Image with Navy Scrim */}
      <img
        src="/images/club-pitch.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
      />
      <div className="absolute inset-0 bg-[#101C32]/75 pointer-events-none" />

      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <LanguageToggle dark />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Club Showcase Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-6 text-white space-y-5 pr-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-blue-300" />
            <span>{t('loginWelcomeBadge')}</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight leading-snug text-white">
            {t('loginHeroTitle')}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {t('loginHeroDesc')}
          </p>

          {/* Team Photo Strip */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl overflow-hidden border border-white/15 h-28 shadow-md">
              <img
                src="/images/team-blue.jpg"
                alt="Blue Squad"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/15 h-28 shadow-md">
              <img
                src="/images/team-red.jpg"
                alt="Red Squad"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Right Login Form Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8">
            {/* Preserved Club Logo & Title */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3.5">
                <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-[#2563EB]/30 ring-4 ring-[#101C32]/10 shadow-md bg-[#101C32]">
                  <img
                    src="/logo.jpg"
                    alt="ក្រុមខ្មែរតែមួយ - Khmer Team One"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-[#101C32] tracking-tight">
                {t('brandName')}
              </h2>
              <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wider mt-1">
                {t('adminAccess')}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {t('adminPrompt')}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="accessCode"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  {t('accessCodeLabel')}
                </label>
                <div className="relative">
                  <input
                    id="accessCode"
                    name="accessCode"
                    type={showCode ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder={t('accessCodePlaceholder')}
                    className="block w-full rounded-xl border border-slate-300 bg-[#F8FAFC] py-3 pl-3.5 pr-10 text-xs text-[#101C32] placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-hidden font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    aria-label={showCode ? 'Hide access code' : 'Show access code'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#101C32] cursor-pointer"
                  >
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#101C32] hover:bg-slate-800 py-3 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('validating')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('btnAccessDashboard')}</span>
                    <ArrowRight className="w-4 h-4 text-blue-300" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Initial Access Code Box */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#101C32]">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <span>{t('initialCodeNotice')}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  {t('initialCodeDesc')}
                </p>
                <div className="mt-2 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <code className="text-xs font-mono font-bold text-[#101C32] select-all">
                    REACH701631
                  </code>
                  <button
                    type="button"
                    onClick={() => setAccessCode('REACH701631')}
                    className="text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {t('btnFillCode')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {t('connectedTo')}:{' '}
                <strong className="text-white">
                  {db.isLiveSupabase ? t('liveDatabase') : t('localDatabase')}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
