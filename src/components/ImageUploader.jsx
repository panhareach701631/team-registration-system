import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { uploadMediaImage } from '../utils/imageUpload';
import ImageWithFallback from './ImageWithFallback';

const PRESET_GALLERY = [
  { label: 'Club Full Squad', url: '/images/club-pitch.jpg' },
  { label: 'Blue Squad', url: '/images/team-blue.jpg' },
  { label: 'Red Squad', url: '/images/team-red.jpg' },
  { label: 'Club Crest', url: '/logo.jpg' },
];

export default function ImageUploader({
  value = '',
  onChange,
  folder = 'events', // 'events' | 'teams' | 'players'
  registrationToken = '',
  variant = 'cover', // 'cover' | 'logo' | 'avatar'
  label = '',
  showPresets = false,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    setProgress(5);
    try {
      const url = await uploadMediaImage({
        file,
        folder,
        registrationToken,
        onProgress: (pct) => setProgress(pct),
      });
      onChange(url);
      toast.success(t('imageUploadedToast'));
    } catch (err) {
      const msg = err.message || 'Image upload failed';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 300);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isCompact = variant === 'logo' || variant === 'avatar';

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isCompact ? (
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <ImageWithFallback
              src={value}
              alt={label || 'Image preview'}
              rounded={variant === 'avatar' ? 'rounded-full' : 'rounded-xl'}
              className="w-16 h-16 border border-slate-200 bg-slate-50 shadow-2xs"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label={t('removeImageBtn')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-xs hover:bg-red-700 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#101C32] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{uploading ? t('uploadingImage') : value ? t('changeImageBtn') : t('uploadImageBtn')}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">{t('uploadHint')}</p>

            {uploading && (
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 transition-colors hover:border-[#2563EB]/60">
            {value ? (
              <div className="relative h-44 sm:h-52 w-full">
                <ImageWithFallback
                  src={value}
                  fallbackSrc="/images/club-pitch.jpg"
                  alt="Cover preview"
                  rounded="rounded-none"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-[#101C32]/35 flex items-end justify-between p-3.5">
                  <span className="px-2.5 py-1 rounded-lg bg-[#101C32]/80 text-white text-[11px] font-medium backdrop-blur-xs">
                    {t('uploadHint')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#101C32] bg-white rounded-lg hover:bg-slate-100 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{t('changeImageBtn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange('')}
                      aria-label={t('removeImageBtn')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] rounded-lg hover:bg-red-700 shadow-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="w-full py-9 px-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-2.5 border border-blue-100">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#101C32]">
                  {uploading ? t('uploadingImage') : t('uploadImageBtn')}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">{t('uploadHint')}</span>
              </button>
            )}

            {uploading && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
                <div
                  className="h-full bg-[#2563EB] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <p role="alert" className="text-[11px] font-medium text-[#DC2626]">
          {uploadError}
        </p>
      )}

      {/* Built-in Club Gallery Presets */}
      {showPresets && (
        <div className="pt-1">
          <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
            {t('quickClubGallery')}:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_GALLERY.map((preset) => {
              const active = value === preset.url;
              return (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => onChange(preset.url)}
                  className={`relative group flex items-center gap-1.5 p-1 pr-2.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                    active
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-6 h-6 rounded object-cover"
                  />
                  <span>{preset.label}</span>
                  {active && <Check className="w-3 h-3 text-[#2563EB]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
