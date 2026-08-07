import React, { useEffect } from 'react';
import { useT } from '../../context/LanguageContext';

/**
 * Mobile: a bottom sheet (thumb-reachable, with a drag-handle affordance).
 * Desktop: a centered dialog.
 * Closes on backdrop click and on Escape.
 */
const Modal = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
  const { t } = useT();

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? t(title) : undefined}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full ${widths[size]} bg-white dark:bg-slate-900
          border border-gray-100 dark:border-slate-800 shadow-2xl
          rounded-t-3xl sm:rounded-2xl
          max-h-[92vh] sm:max-h-[88vh] flex flex-col
          animate-sheet-up sm:animate-scale-up`}
      >
        {/* Drag handle — mobile affordance only */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate pr-2">{typeof title === 'string' ? t(title) : title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="erp-icon-btn h-8 w-8"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
