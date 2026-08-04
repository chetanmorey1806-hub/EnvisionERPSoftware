import React from 'react';
import Button from './Button';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, type = 'danger' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scale-up">
        <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-slate-400">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={type === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>Proceed</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;