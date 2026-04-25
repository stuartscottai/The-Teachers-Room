import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { CheckCircle, Copy, Download, Link2, QrCode, X } from 'lucide-react';

interface StudentShareModalProps {
  isOpen: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export const StudentShareModal: React.FC<StudentShareModalProps> = ({ isOpen, url, title, onClose }) => {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      alert(`Copy failed. Share this link:\n${url}`);
    }
  };

  const downloadQr = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'student-game';
    link.download = `${safeTitle}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase text-sky-700">
              <QrCode size={14} />
              Student Practice
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={qrWrapRef} className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-white p-4">
          <QRCodeCanvas value={url} size={220} includeMargin />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
            <Link2 size={13} />
            Student link
          </div>
          <div className="break-all text-sm font-semibold text-slate-700">{url}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 font-black text-white hover:brightness-110"
          >
            {copied ? <CheckCircle size={17} /> : <Copy size={17} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={downloadQr}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50"
          >
            <Download size={17} />
            QR PNG
          </button>
        </div>
      </div>
    </div>
  );
};
