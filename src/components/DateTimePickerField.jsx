import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Edit3 } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

const QUICK_TIMES = [
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
];

function formatEventDateTime(dateStr, timeStr) {
  let formattedDate = '';
  if (dateStr) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!Number.isNaN(localDate.getTime())) {
        formattedDate = localDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
  }

  let formattedTime = '';
  if (timeStr) {
    const [hhRaw, mmRaw] = timeStr.split(':').map(Number);
    if (!Number.isNaN(hhRaw) && !Number.isNaN(mmRaw)) {
      const period = hhRaw >= 12 ? 'PM' : 'AM';
      const h12 = hhRaw % 12 || 12;
      formattedTime = `${String(h12).padStart(2, '0')}:${String(mmRaw).padStart(2, '0')} ${period}`;
    }
  }

  if (formattedDate && formattedTime) return `${formattedDate} - ${formattedTime}`;
  return formattedDate || formattedTime || '';
}

function parseEventDateTime(value) {
  const raw = (value || '').trim();
  if (!raw) return { date: '', time: '', isUnparsedCustom: false };

  let time = '';
  let datePart = raw;

  const timeMatch = raw.match(/(?:\s*[-•]\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hh = parseInt(timeMatch[1], 10);
    const mm = parseInt(timeMatch[2], 10);
    const meridiem = (timeMatch[3] || '').toUpperCase();

    if (meridiem === 'PM' && hh < 12) hh += 12;
    if (meridiem === 'AM' && hh === 12) hh = 0;

    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      datePart = raw.slice(0, timeMatch.index).replace(/[-•\s]+$/, '').trim();
    }
  }

  let date = '';
  if (datePart) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      date = datePart;
    } else {
      const parsed = new Date(datePart);
      if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        date = `${y}-${m}-${d}`;
      }
    }
  }

  const isUnparsedCustom = Boolean(raw && !date && !time);
  return { date, time, isUnparsedCustom };
}

/**
 * Date and Time selector component for Event Create & Edit forms.
 * Keeps `value` synced as a formatted string (`event_time`) compatible with existing records & reports.
 */
export default function DateTimePickerField({
  value = '',
  onChange,
  error = '',
  idPrefix = 'event',
}) {
  const { t } = useLanguage();
  const parsed = useMemo(() => parseEventDateTime(value), [value]);
  const [customMode, setCustomMode] = useState(false);

  const isCustomActive = customMode || parsed.isUnparsedCustom;

  const handleDateChange = (newDate) => {
    onChange(formatEventDateTime(newDate, parsed.time));
  };

  const handleTimeChange = (newTime) => {
    onChange(formatEventDateTime(parsed.date, newTime));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="block text-xs font-bold text-slate-700">
          {t('fieldTime')} <span className="text-[#DC2626]">*</span>
        </span>
        <button
          type="button"
          onClick={() => setCustomMode((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
        >
          <Edit3 className="w-3 h-3" />
          <span>{isCustomActive ? t('pickerTimeMode') : t('customTimeMode')}</span>
        </button>
      </div>

      {isCustomActive ? (
        <div className="relative">
          <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id={`${idPrefix}-time-custom`}
            type="text"
            placeholder={t('fieldTimePlaceholder')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-9 pr-3.5 text-xs text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:bg-white transition-colors ${
              error ? 'border-[#DC2626]' : 'border-slate-200 focus:border-[#2563EB]'
            }`}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor={`${idPrefix}-date`}
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                {t('fieldDate')}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id={`${idPrefix}-date`}
                  type="date"
                  value={parsed.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-xs font-medium text-[#101C32] focus:outline-hidden focus:bg-white transition-colors cursor-pointer ${
                    error && !parsed.date
                      ? 'border-[#DC2626]'
                      : 'border-slate-200 focus:border-[#2563EB]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`${idPrefix}-clock`}
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                {t('fieldHourTime')}
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#2563EB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id={`${idPrefix}-clock`}
                  type="time"
                  value={parsed.time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className={`w-full rounded-xl border bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-xs font-medium text-[#101C32] focus:outline-hidden focus:bg-white transition-colors cursor-pointer ${
                    error && !parsed.time
                      ? 'border-[#DC2626]'
                      : 'border-slate-200 focus:border-[#2563EB]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 mr-0.5">
              {t('quickTimePresets')}:
            </span>
            {QUICK_TIMES.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleTimeChange(preset.value)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                  parsed.time === preset.value
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-[#F8FAFC] text-slate-600 border-slate-200 hover:border-[#2563EB]/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {value && (
            <div className="px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-[#101C32] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="font-semibold truncate">{value}</span>
            </div>
          )}
        </>
      )}

      {error && <p className="mt-1 text-[11px] text-[#DC2626] font-medium">{error}</p>}
    </div>
  );
}
