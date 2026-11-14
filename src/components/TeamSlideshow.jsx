import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import ImageWithFallback from './ImageWithFallback';

/**
 * Interactive Team Slideshow showcasing club squad photos and optional competing team visuals.
 * Used on the Admin Dashboard homepage and the public Member Registration page.
 */
export default function TeamSlideshow({
  teams = [],
  coverImage = '',
  eventTitle = '',
  showDirectoryButton = false,
  compact = false,
}) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = useMemo(() => {
    const items = [];
    const seen = new Set();

    const addSlide = (slide) => {
      if (!slide.image) return;
      const key = `${slide.image}|${slide.title}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(slide);
    };

    if (coverImage && !coverImage.includes('/images/club-pitch.jpg')) {
      addSlide({
        image: coverImage,
        badge: t('slideshowEventBadge'),
        title: eventTitle || t('brandName'),
        subtitle: t('slideshowSlideClubDesc'),
        accent: '#2563EB',
      });
    }

    addSlide({
      image: '/images/club-pitch.jpg',
      badge: t('brandName'),
      title: t('slideshowSlideClubTitle'),
      subtitle: t('slideshowSlideClubDesc'),
      accent: '#2563EB',
    });

    addSlide({
      image: '/images/team-red.jpg',
      badge: 'Team Red',
      title: t('slideshowSlideRedTitle'),
      subtitle: t('slideshowSlideRedDesc'),
      accent: '#DC2626',
    });

    addSlide({
      image: '/images/team-blue.jpg',
      badge: 'Team Blue',
      title: t('slideshowSlideBlueTitle'),
      subtitle: t('slideshowSlideBlueDesc'),
      accent: '#2563EB',
    });

    teams.forEach((team) => {
      if (team?.logo_url && !seen.has(`${team.logo_url}|${team.team_name}`)) {
        addSlide({
          image: team.logo_url,
          badge: `Team ${team.team_letter}`,
          title: team.team_name || `Team ${team.team_letter}`,
          subtitle: team.captain_name
            ? `${t('fieldCaptainName')}: ${team.captain_name}`
            : t('slideshowSlideClubDesc'),
          accent: team.team_color || '#2563EB',
        });
      }
    });

    return items;
  }, [coverImage, eventTitle, teams, t]);

  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0;

  useEffect(() => {
    if (isPaused || slides.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const goPrev = () => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const current = slides[safeIndex];
  if (!current) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-[#101C32] border border-slate-800 shadow-sm group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Visual Stage */}
      <div className={`relative w-full ${compact ? 'h-56 sm:h-72' : 'h-60 sm:h-80'}`}>
        <ImageWithFallback
          key={current.image}
          src={current.image}
          fallbackSrc="/images/club-pitch.jpg"
          alt={current.title}
          rounded="rounded-none"
          className="w-full h-full object-cover object-center transition-all duration-500"
        />

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101C32] via-[#101C32]/45 to-[#101C32]/20" />

        {/* Top Bar Inside Slideshow */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#101C32]/80 backdrop-blur-xs border border-white/15 text-white">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-5 h-5 rounded-full object-cover border border-white/40"
            />
            <span className="text-[11px] font-bold tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-300" />
              {t('slideshowHeading')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
              className="p-2 rounded-full bg-[#101C32]/75 hover:bg-[#101C32] text-white border border-white/15 transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <span className="px-2.5 py-1 rounded-full bg-[#101C32]/75 text-[11px] font-mono font-bold text-slate-200 border border-white/15">
              {safeIndex + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Left / Right Controls */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-[#101C32]/70 hover:bg-[#2563EB] text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-[#101C32]/70 hover:bg-[#2563EB] text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Bottom Caption Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: current.accent || '#2563EB' }}
            >
              {current.badge}
            </span>
            <h3 className="text-base sm:text-xl font-extrabold text-white leading-tight">
              {current.title}
            </h3>
            <p className="text-xs text-slate-200 line-clamp-2">{current.subtitle}</p>
          </div>

          {showDirectoryButton && (
            <Link
              to="/admin/members"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#101C32] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors self-start sm:self-end shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{t('teamMembersTitle')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Thumbnail Dots Bar */}
      {slides.length > 1 && (
        <div className="px-4 py-2.5 bg-[#0B1526] border-t border-white/10 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            {slides.map((slide, idx) => (
              <button
                key={`${slide.image}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 pr-2.5 pl-1 py-1 rounded-lg border text-left transition-all cursor-pointer shrink-0 ${
                  idx === safeIndex
                    ? 'bg-[#2563EB] border-blue-400 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-7 h-5 rounded object-cover shrink-0"
                />
                <span className="text-[11px] font-semibold max-w-[110px] truncate">
                  {slide.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safeIndex ? 'w-6 bg-[#2563EB]' : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
