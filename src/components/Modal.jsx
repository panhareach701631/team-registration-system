import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="fixed inset-0 bg-[#101C32]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full ${maxWidth} border border-slate-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-4 bg-[#F8FAFC]">
            <h3 className="text-base font-bold text-[#101C32] tracking-tight pr-4">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-[#101C32] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
