import React from 'react';
import { Icons } from './icons';
import { useT } from '../../context/LanguageContext';

const EmptyState = ({
  icon: Icon = Icons.empty,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
}) => {
  const { t } = useT();
  return (
  <div className="w-full text-center py-14 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 animate-fade-up">
    <Icon size={40} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300 dark:text-slate-700" aria-hidden="true" />
    <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">{t(title)}</h3>
    {description && (
      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-4">{t(description)}</p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="erp-btn-primary px-4 py-2 text-xs"
      >
        {t(actionLabel)}
      </button>
    )}
  </div>
  );
};

export default EmptyState;
