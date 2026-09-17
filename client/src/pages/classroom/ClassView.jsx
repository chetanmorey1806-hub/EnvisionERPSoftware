import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { classApi } from '../../api/classApi';
import {
  THEMES, themeStyle, inputCls, useToast, errText,
} from '../../components/classroom/classKit';
import StreamTab from '../../components/classroom/StreamTab';
import ClassworkTab from '../../components/classroom/ClassworkTab';
import PeopleTab from '../../components/classroom/PeopleTab';
import GradesTab from '../../components/classroom/GradesTab';
import WorkDetail from '../../components/classroom/WorkDetail';

/**
 * One class — Stream, Classwork, People and (for teachers) Grades.
 *
 * The open tab and the open piece of work live in the URL (?tab=, ?item=), so
 * a notification can link straight to "this assignment in this class" and the
 * back button behaves.
 */
const ClassView = () => {
  const { batchId } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [cls, setCls] = useState(null);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const tab = params.get('tab') || 'stream';
  const itemId = params.get('item');

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const load = useCallback(() => {
    classApi.get(batchId)
      .then((r) => { setCls(r.data.data); setError(''); })
      .catch((e) => setError(errText(e, 'Could not open this class.')));
  }, [batchId]);
  useEffect(load, [load]);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(cls.class_code); toast('Class code copied', 'success'); }
    catch { toast(`Class code: ${cls.class_code}`, 'info'); }
  };

  const openSettings = () => {
    setDraft({ theme: cls.theme, description: cls.description || '', join_enabled: cls.join_enabled });
    setSettingsOpen(true);
  };
  const saveSettings = async () => {
    setSaving(true);
    try {
      const r = await classApi.updateSettings(batchId, draft);
      setCls(r.data.data); setSettingsOpen(false); toast('Class settings saved', 'success');
    } catch (e) { toast(errText(e, 'Could not save the settings.'), 'error'); } finally { setSaving(false); }
  };
  const resetCode = async () => {
    try {
      const r = await classApi.resetCode(batchId);
      setCls((c) => ({ ...c, class_code: r.data.data.class_code }));
      toast(r.data.message, 'success');
    } catch (e) { toast(errText(e, 'Could not reset the code.'), 'error'); }
  };

  if (error) {
    return (
      <div className="erp-card p-8 text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{error}</p>
        <Link to="/classroom" className="erp-btn erp-btn-outline text-xs px-4 py-2 mt-4 inline-flex">Back to classes</Link>
      </div>
    );
  }
  if (!cls) return <div className="erp-card h-48 animate-pulse" />;

  const tabs = [
    ['stream', 'Stream'],
    ['classwork', 'Classwork'],
    ['people', 'People'],
    ...(cls.can_teach ? [['grades', 'Grades']] : []),
  ];

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link to="/classroom" className="p-2 mr-1 text-gray-500 hover:text-gray-800 dark:hover:text-slate-100" title="All classes" aria-label="All classes">
            <Icons.chevronLeft size={18} aria-hidden="true" />
          </Link>
          {tabs.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setParam('tab', key === 'stream' ? '' : key)}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
                tab === key ? 'border-brand-600 text-brand-600 dark:text-brand-300' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {cls.can_teach && (
          <button type="button" onClick={openSettings} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-slate-100" title="Class settings" aria-label="Class settings">
            <Icons.settings size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {tab === 'stream' && (
        <div className="relative rounded-2xl overflow-hidden text-white px-6 py-6 sm:py-8 min-h-[150px] flex flex-col justify-end" style={themeStyle(cls.theme)}>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{cls.name}</h1>
          <p className="text-[14px] text-white/90 mt-1">{[cls.course_name, cls.trainer_name].filter(Boolean).join(' · ')}</p>
          {cls.description && <p className="text-[13px] text-white/85 mt-2 max-w-2xl whitespace-pre-wrap">{cls.description}</p>}
          {cls.can_teach && (
            <button type="button" onClick={copyCode}
              className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-[12px] backdrop-blur-sm transition">
              Class code <span className="font-mono font-bold tracking-wider">{cls.class_code}</span>
            </button>
          )}
        </div>
      )}

      {tab === 'stream' && <StreamTab cls={cls} refreshKey={refreshKey} onOpenItem={(id) => setParam('item', id)} />}
      {tab === 'classwork' && <ClassworkTab cls={cls} refreshKey={refreshKey} onOpenItem={(id) => setParam('item', id)} />}
      {tab === 'people' && <PeopleTab cls={cls} onCopyCode={copyCode} />}
      {tab === 'grades' && cls.can_teach && <GradesTab cls={cls} refreshKey={refreshKey} onOpenItem={(id) => setParam('item', id)} />}

      {itemId && (
        <WorkDetail
          cls={cls}
          itemId={itemId}
          onClose={() => setParam('item', '')}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Class settings" size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" className="erp-btn erp-btn-soft text-xs px-4 py-2" onClick={() => setSettingsOpen(false)}>Cancel</button>
            <button type="button" className="erp-btn erp-btn-primary text-xs px-4 py-2" disabled={saving} onClick={saveSettings}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}>
        {draft && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Banner colour</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(THEMES).map((t) => (
                  <button key={t} type="button" onClick={() => setDraft({ ...draft, theme: t })} title={t} aria-label={`${t} banner`}
                    className={`h-9 w-9 rounded-full border-2 transition ${draft.theme === t ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                    style={themeStyle(t)} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Description</p>
              <textarea rows={3} className={`${inputCls} resize-y`} maxLength={2000} value={draft.description}
                placeholder="What this class covers, timings, rules…"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100">Class code</p>
                  <p className="font-mono text-lg font-bold tracking-widest text-brand-600 dark:text-brand-300">{cls.class_code}</p>
                </div>
                <button type="button" onClick={resetCode} className="erp-btn erp-btn-outline text-xs px-3 py-2">
                  <Icons.reset size={13} aria-hidden="true" /> Reset code
                </button>
              </div>
              <label className="flex items-center justify-between gap-3 text-[13px] cursor-pointer">
                <span>
                  <span className="font-semibold text-gray-800 dark:text-slate-100 block">Students can join with the code</span>
                  <span className="text-[11px] text-gray-500">Turn off once everyone is in, so nobody else can join.</span>
                </span>
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!draft.join_enabled}
                  onChange={(e) => setDraft({ ...draft, join_enabled: e.target.checked })} />
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassView;
