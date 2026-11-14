import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from './Modal';
import { Copy, Check, Download, ExternalLink } from 'lucide-react';
import { getRegistrationUrl } from '../utils/formatting';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';

export default function QrCodeModal({ isOpen, onClose, event }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const { t } = useLanguage();
  const toast = useToast();

  if (!event) return null;

  const registrationUrl = getRegistrationUrl(event.registration_token);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = registrationUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    const safeName = (event.topic || 'event').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
    downloadLink.download = `QR_${safeName}_${event.registration_token}.png`;
    downloadLink.href = pngUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success(t('downloadQrCode'));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('viewQr')} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <h4 className="text-base font-bold text-[#101C32] line-clamp-1">{event.topic}</h4>
        <p className="text-xs text-slate-500 mt-1">
          {event.event_time} • {event.location}
        </p>

        <div
          ref={qrRef}
          className="mt-5 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-center ring-4 ring-slate-100"
        >
          <QRCodeCanvas
            value={registrationUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="mt-5 w-full">
          <label className="block text-left text-xs font-semibold text-slate-600 mb-1.5">
            {t('copyLink')}
          </label>
          <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-left">
            <input
              type="text"
              readOnly
              value={registrationUrl}
              aria-label={t('copyLink')}
              className="bg-transparent text-xs text-[#101C32] w-full outline-hidden font-mono select-all font-medium"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#101C32] hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-300" />
            <span>{t('downloadQrCode')}</span>
          </button>
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t('openRegistration')}</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
