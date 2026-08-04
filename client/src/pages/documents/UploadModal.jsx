import React, { useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { inputCls } from '../../components/form/FormKit';
import { documentApi } from '../../api/documentApi';
import { useT } from '../../context/LanguageContext';
import { formatSize } from './fileKind';

/** Upload a file into the current folder, with tags. */
const UploadModal = ({ folderId, tags = [], onClose, onDone }) => {
  const { t } = useT();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  const choose = (f) => {
    if (!f) return;
    setFile(f);
    setName((n) => n || f.name);
    setError('');
  };

  const toggleTag = (tag) =>
    setPicked((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]));

  const addCustom = () => {
    const v = custom.trim();
    if (v && !picked.includes(v)) setPicked((p) => [...p, v]);
    setCustom('');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!file) { setError('Choose a file to upload.'); return; }
    setSaving(true); setError(''); setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (folderId) fd.append('folderId', folderId);
      if (name.trim()) fd.append('name', name.trim());
      fd.append('tags', JSON.stringify(picked));

      const r = await documentApi.upload(fd, setProgress);
      onDone(r.data.message || `"${name || file.name}" uploaded.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload this file.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen size="lg" title={t('Upload document')} onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 press">
            {t('Cancel')}
          </button>
          <button onClick={save} disabled={saving || !file}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50 press">
            <Icons.upload size={14} /> {saving ? `${t('Uploading…')} ${progress}%` : t('Upload')}
          </button>
        </>
      }>
      <form onSubmit={save} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs flex items-center gap-2">
            <Icons.warning size={14} /> {error}
          </div>
        )}

        {/* drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
            drag
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
              : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
          }`}
        >
          <input ref={inputRef} type="file" className="hidden"
            onChange={(e) => choose(e.target.files?.[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Icons.success size={16} className="text-emerald-500" />
              <span className="font-semibold text-gray-800 dark:text-slate-100 truncate">{file.name}</span>
              <span className="text-gray-400 text-xs">{formatSize(file.size)}</span>
            </div>
          ) : (
            <>
              <Icons.upload size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t('Drop a file here, or click to browse')}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">{t('Up to 25 MB.')}</p>
            </>
          )}
        </div>

        {saving && (
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Display name')}</span>
          <input className={`${inputCls} mt-1`} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('Leave blank to use the file name')} />
        </label>

        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Tags')}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((x) => (
              <button key={x.name} type="button" onClick={() => toggleTag(x.name)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition press ${
                  picked.includes(x.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                }`}>
                {t(x.name)}
              </button>
            ))}
            {picked.filter((p) => !tags.some((x) => x.name === p)).map((p) => (
              <button key={p} type="button" onClick={() => toggleTag(p)}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white press">
                {p} ✕
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className={inputCls} value={custom} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder={t('Add your own tag…')} />
            <button type="button" onClick={addCustom}
              className="px-3 py-2.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-800 press">
              {t('Add')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UploadModal;
