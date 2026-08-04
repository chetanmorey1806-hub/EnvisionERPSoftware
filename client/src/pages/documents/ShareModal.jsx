import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { inputCls } from '../../components/form/FormKit';
import { documentApi } from '../../api/documentApi';
import { useT } from '../../context/LanguageContext';

const ACCESS = [
  { value: 'view', label: 'View only', hint: 'They can open it, but not save a copy.' },
  { value: 'download', label: 'View & download', hint: 'They can open it and download it.' },
];

/**
 * Share a folder or file with other people.
 * Sharing a FOLDER also shares everything inside it — the server resolves that
 * at read time, so new files added later are covered automatically.
 */
const ShareModal = ({ target, onClose, onDone }) => {
  const { t } = useT();
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [access, setAccess] = useState('view');
  const [expires, setExpires] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    documentApi.shareUsers()
      .then((r) => setUsers(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load people.'));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email || ''}`.toLowerCase().includes(q));
  }, [users, search]);

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async (e) => {
    e.preventDefault();
    if (!picked.length) { setError('Choose at least one person.'); return; }
    setSaving(true); setError('');
    try {
      const r = await documentApi.share({
        itemType: target.itemType,
        itemId: target.itemId,
        userIds: picked,
        accessLevel: access,
        expiresAt: expires || null,
      });
      onDone(r.data.message || 'Shared.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to share this item.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen size="lg" title={`${t('Share')} "${target.name}"`} onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 press">
            {t('Cancel')}
          </button>
          <button onClick={save} disabled={saving || !picked.length}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50 press">
            <Icons.share size={14} /> {saving ? t('Saving…') : `${t('Share with')} ${picked.length}`}
          </button>
        </>
      }>
      <form onSubmit={save} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs flex items-center gap-2">
            <Icons.warning size={14} /> {error}
          </div>
        )}

        {target.itemType === 'folder' && (
          <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300">
            {t('Sharing a folder also shares everything inside it, including files you add later.')}
          </div>
        )}

        {/* who */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Share with')}</span>
          <div className="relative mt-1">
            <Icons.search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className={`${inputCls} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search people…')} />
          </div>

          <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800">
            {visible.length === 0 && (
              <p className="p-3 text-xs text-gray-400">{t('Nobody found.')}</p>
            )}
            {visible.map((u) => (
              <button key={u.id} type="button" onClick={() => toggle(u.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition ${
                  picked.includes(u.id) ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{u.name}</span>
                  <span className="block text-[10px] text-gray-400 truncate">{u.email} · {t(u.role)}</span>
                </span>
                {picked.includes(u.id) && <Icons.check size={15} className="text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* access level */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Access level')}</span>
          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACCESS.map((a) => (
              <button key={a.value} type="button" onClick={() => setAccess(a.value)}
                className={`p-3 rounded-lg border text-left transition press ${
                  access === a.value
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                }`}>
                <span className="block text-xs font-bold text-gray-800 dark:text-slate-100">{t(a.label)}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{t(a.hint)}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Expires on')}</span>
          <input type="date" className={`${inputCls} mt-1`} value={expires}
            onChange={(e) => setExpires(e.target.value)} />
          <span className="text-[10px] text-gray-400">{t('Leave blank for access that never expires.')}</span>
        </label>
      </form>
    </Modal>
  );
};

export default ShareModal;
