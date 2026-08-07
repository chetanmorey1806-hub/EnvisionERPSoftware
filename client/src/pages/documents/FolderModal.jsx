import React, { useState } from 'react';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { inputCls } from '../../components/form/FormKit';
import { documentApi } from '../../api/documentApi';
import { useT } from '../../context/LanguageContext';

/** New folder, or rename an existing one. */
const FolderModal = ({ mode = 'new', folder, parentId, onClose, onDone }) => {
  const { t } = useT();
  const isRename = mode === 'rename';

  const [name, setName] = useState(isRename ? folder?.name || '' : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Folder name is required.'); return; }
    setSaving(true); setError('');
    try {
      const r = isRename
        ? await documentApi.renameFolder(folder.id, name.trim())
        : await documentApi.createFolder({ name: name.trim(), parentId: parentId || undefined });
      onDone(r.data.message || (isRename ? 'Folder renamed.' : 'Folder created.'));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the folder.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen size="sm" title={isRename ? t('Rename folder') : t('New folder')} onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 press">
            {t('Cancel')}
          </button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-brand-600 text-white disabled:opacity-50 press">
            <Icons.check size={14} /> {saving ? t('Saving…') : isRename ? t('Rename') : t('Create folder')}
          </button>
        </>
      }>
      <form onSubmit={save} className="space-y-3">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs flex items-center gap-2">
            <Icons.warning size={14} /> {error}
          </div>
        )}
        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            {t('Folder name')} <span className="text-rose-500">*</span>
          </span>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input autoFocus className={`${inputCls} mt-1`} value={name}
            onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Fee Receipts 2026')} />
        </label>
        {!isRename && parentId && (
          <p className="text-[11px] text-gray-400">{t('This folder will be created inside the folder you are in.')}</p>
        )}
      </form>
    </Modal>
  );
};

export default FolderModal;
