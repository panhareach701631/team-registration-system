import React, { useState, useCallback, useRef } from 'react';
import { ToastContext } from './contexts';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      idCounter.current += 1;
      const id = `toast_${idCounter.current}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    dismiss,
  };

  const styles = {
    success: {
      box: 'bg-white border-emerald-200 text-slate-800 shadow-lg ring-1 ring-emerald-500/10',
      icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
      bar: 'bg-[#16A34A]',
    },
    error: {
      box: 'bg-white border-red-200 text-slate-800 shadow-lg ring-1 ring-red-500/10',
      icon: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
      bar: 'bg-[#DC2626]',
    },
    warning: {
      box: 'bg-white border-amber-200 text-slate-800 shadow-lg ring-1 ring-amber-500/10',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      bar: 'bg-amber-500',
    },
    info: {
      box: 'bg-white border-blue-200 text-slate-800 shadow-lg ring-1 ring-blue-500/10',
      icon: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
      bar: 'bg-[#2563EB]',
    },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Accessible Toast Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((item) => {
          const style = styles[item.type] || styles.info;
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 pr-9 flex items-start gap-3 transition-all animate-slide-in ${style.box}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
              {style.icon}
              <p className="text-xs font-medium leading-relaxed text-slate-700 break-words">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Close notification"
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
