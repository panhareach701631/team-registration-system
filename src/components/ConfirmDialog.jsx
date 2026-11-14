import React from 'react';
import Modal from './Modal';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-[#DC2626]" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-[#2563EB]" />,
  };

  const iconBg = {
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }[type];

  const buttonClasses = {
    danger: 'bg-[#DC2626] hover:bg-red-700 focus-visible:ring-[#DC2626] text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600 text-white',
    info: 'bg-[#2563EB] hover:bg-blue-700 focus-visible:ring-[#2563EB] text-white',
  }[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-3 rounded-xl border ${iconBg}`}>{icons[type]}</div>
        <div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-0.5">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-[#101C32] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer ${buttonClasses}`}
        >
          {isLoading && (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  );
}
