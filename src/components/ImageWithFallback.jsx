import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/**
 * Reliable lazy-loading image component with fallback image or clean icon placeholder.
 * Prevents broken image icons across all browsers.
 */
export default function ImageWithFallback({
  src,
  fallbackSrc = '',
  alt = '',
  className = '',
  fallbackText = '',
  rounded = 'rounded-xl',
  iconSize = 'w-5 h-5',
}) {
  const [failedPrimarySrc, setFailedPrimarySrc] = useState(null);
  const [failedFallbackSrc, setFailedFallbackSrc] = useState(null);

  let activeSrc = '';
  if (src && failedPrimarySrc !== src) {
    activeSrc = src;
  } else if (fallbackSrc && failedFallbackSrc !== fallbackSrc) {
    activeSrc = fallbackSrc;
  }

  const handleError = () => {
    if (src && activeSrc === src) {
      setFailedPrimarySrc(src);
    } else if (fallbackSrc && activeSrc === fallbackSrc) {
      setFailedFallbackSrc(fallbackSrc);
    }
  };

  if (!activeSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200 select-none ${rounded} ${className}`}
        role="img"
        aria-label={alt || 'Placeholder'}
      >
        {fallbackText ? (
          <span className="font-bold text-slate-600 uppercase tracking-tight">
            {fallbackText.slice(0, 2)}
          </span>
        ) : (
          <ImageIcon className={iconSize} />
        )}
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}
