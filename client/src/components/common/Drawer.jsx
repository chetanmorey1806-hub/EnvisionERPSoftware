import React from 'react';

const Drawer = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in rounded-l-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/70 dark:bg-slate-800/40">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm truncate pr-2">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="erp-icon-btn h-8 w-8 shrink-0">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;