import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-ink-950/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all w-full ${maxWidth} border border-paper-200`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-paper-200/80 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink-900">{title}</h3>
              {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-ink-400 hover:text-ink-700 p-1.5 rounded-lg hover:bg-paper-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
