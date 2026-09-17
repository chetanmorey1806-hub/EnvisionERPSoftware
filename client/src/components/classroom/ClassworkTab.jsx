import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { Icons } from '../common/icons';
import { classApi } from '../../api/classApi';
import {
  StatusChip, fmtDue, fmtWhen, inputCls, themeColor, toLocalInput, typeOf, useToast, errText,
} from './classKit';

const EMPTY = { type: 'assignment', title: '', instructions: '', points: '100', due_at: '', topic_id: '', file: null };

/** Create or edit a piece of classwork. Editing cannot swap the attachment. */
export const WorkForm = ({ cls, topics, initial, onClose, onSaved }) => {
  const toast = useToast();
  const editing = !!initial?.id;
  const [f, setF] = useState(() => (editing
    ? { ...EMPTY, ...initial, points: initial.points ?? '', due_at: toLocalInput(initial.due_at), topic_id: initial.topic_id || '' }
    : { ...EMPTY, ...(initial || {}) }));
  const [busy, setBusy] = useState(false);
  const isMaterial = f.type === 'material';

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        title: f.title, instructions: f.instructions, topic_id: f.topic_id || null,
        ...(isMaterial ? {} : { points: f.points === '' ? null : f.points, due_at: f.due_at || null }),
      };
      if (editing) await classApi.updateWork(cls.id, initial.id, payload);
      else await classApi.createWork(cls.id, { ...payload, type: f.type, topic_id: f.topic_id, file: f.file, points: isMaterial ? '' : f.points, due_at: isMaterial ? '' : f.due_at });
      toast(editing ? 'Classwork updated' : `${typeOf(f.type).label} posted`, 'success');
      onSaved();
    } catch (e) { toast(errText(e, 'Could not save.'), 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} size="xl" title={editing ? `Edit ${typeOf(f.type).label.toLowerCase()}` : `New ${typeOf(f.type).label.toLowerCase()}`}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" className="erp-btn erp-btn-soft text-xs px-4 py-2" onClick={onClose}>Cancel</button>
          <button type="button" className="erp-btn erp-btn-primary text-xs px-4 py-2" disabled={busy || !f.title.trim()} onClick={save}>
            {busy ? 'Saving…' : editing ? 'Save' : isMaterial ? 'Post' : 'Assign'}
          </button>
        </div>
      )}>
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          <input className={`${inputCls} text-[15px]`} placeholder={f.type === 'question' ? 'Question' : 'Title'} autoFocus maxLength={180}
            value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <textarea rows={6} className={`${inputCls} resize-y`} maxLength={10000}
            placeholder={f.type === 'question' ? 'Instructions (optional)' : 'Instructions (optional)'}
            value={f.instructions || ''} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
          {!editing && (
            <label className="erp-btn erp-btn-outline text-xs px-3 py-2 cursor-pointer w-fit">
              <Icons.upload size={13} aria-hidden="true" /> {f.file ? f.file.name.slice(0, 36) : 'Attach a file'}
              <input type="file" className="hidden" onChange={(e) => setF({ ...f, file: e.target.files?.[0] || null })} />
            </label>
          )}
        </div>
        <div className="space-y-3">
          {!editing && (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Type</span>
              <select className={`${inputCls} mt-1`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="assignment">Assignment</option>
                <option value="question">Question (typed answer)</option>
                <option value="material">Material (no submission)</option>
              </select>
            </label>
          )}
          {!isMaterial && (
            <>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Points</span>
                <input className={`${inputCls} mt-1`} inputMode="numeric" placeholder="Ungraded" value={f.points}
                  onChange={(e) => setF({ ...f, points: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Due</span>
                <input type="datetime-local" className={`${inputCls} mt-1`} value={f.due_at}
                  onChange={(e) => setF({ ...f, due_at: e.target.value })} />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Topic</span>
            <select className={`${inputCls} mt-1`} value={f.topic_id || ''} onChange={(e) => setF({ ...f, topic_id: e.target.value })}>
              <option value="">No topic</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
      </div>
    </Modal>
  );
};

/** Classwork — grouped by topic, with a Create menu for teachers. */
const ClassworkTab = ({ cls, refreshKey, onOpenItem }) => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState(null);         // { type } | item to edit
  const [topicFilter, setTopicFilter] = useState('all');

  const load = useCallback(() => {
    classApi.classwork(cls.id).then((r) => setData(r.data.data)).catch((e) => toast(errText(e, 'Could not load classwork.'), 'error'));
  }, [cls.id, toast]);
  useEffect(load, [load, refreshKey]);

  const groups = useMemo(() => {
    if (!data) return [];
    const byTopic = [{ id: null, name: null, items: data.items.filter((i) => !i.topic_id) }];
    for (const t of data.topics) byTopic.push({ ...t, items: data.items.filter((i) => i.topic_id === t.id) });
    return byTopic.filter((g) => (topicFilter === 'all' ? g.id === null ? g.items.length > 0 : true : String(g.id) === topicFilter));
  }, [data, topicFilter]);

  const addTopic = async () => {
    setMenu(false);
    const name = window.prompt('Topic name');
    if (!name?.trim()) return;
    try { await classApi.createTopic(cls.id, name.trim()); load(); } catch (e) { toast(errText(e, 'Could not add the topic.'), 'error'); }
  };
  const renameTopic = async (t) => {
    const name = window.prompt('Rename topic', t.name);
    if (!name?.trim() || name.trim() === t.name) return;
    try { await classApi.renameTopic(cls.id, t.id, name.trim()); load(); } catch (e) { toast(errText(e, 'Could not rename.'), 'error'); }
  };
  const removeTopic = async (t) => {
    if (!window.confirm(`Delete topic "${t.name}"? Its classwork is kept, under No topic.`)) return;
    try { await classApi.removeTopic(cls.id, t.id); load(); } catch (e) { toast(errText(e, 'Could not delete.'), 'error'); }
  };

  if (!data) return <div className="erp-card h-40 animate-pulse" />;
  const tone = themeColor(cls.theme);

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        {cls.can_teach && (
          <div className="relative mb-3">
            <button type="button" onClick={() => setMenu((m) => !m)} className="erp-btn erp-btn-primary text-sm px-5 py-2.5 rounded-full shadow-md">
              <Icons.plus size={16} aria-hidden="true" /> Create
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="absolute z-40 mt-2 w-52 erp-card shadow-xl py-1">
                  {['assignment', 'question', 'material'].map((t) => {
                    const T = typeOf(t);
                    return (
                      <button key={t} type="button" onClick={() => { setMenu(false); setForm({ type: t }); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left hover:bg-gray-50 dark:hover:bg-slate-800">
                        <T.icon size={16} className="text-gray-500" aria-hidden="true" /> {T.label}
                      </button>
                    );
                  })}
                  <div className="border-t border-gray-100 dark:border-slate-800 my-1" />
                  <button type="button" onClick={addTopic} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left hover:bg-gray-50 dark:hover:bg-slate-800">
                    <Icons.layers size={16} className="text-gray-500" aria-hidden="true" /> Topic
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {[{ id: 'all', name: 'All topics' }, ...data.topics].map((t) => {
          const on = topicFilter === String(t.id);
          return (
            <button key={t.id} type="button" onClick={() => setTopicFilter(String(t.id))}
              className={`w-full text-left px-3 py-2 rounded-r-full text-[13px] truncate transition ${on ? 'font-bold' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              style={on ? { color: tone, background: `${tone}14` } : undefined}>
              {t.name}
            </button>
          );
        })}
      </aside>

      <div className="space-y-6 min-w-0">
        {data.items.length === 0 && data.topics.length === 0 && (
          <div className="erp-card p-10 text-center">
            <Icons.courses size={38} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="text-[14px] font-semibold text-gray-800 dark:text-slate-100">
              {cls.can_teach ? 'This is where you assign work' : 'No classwork yet'}
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              {cls.can_teach ? 'Press Create to add assignments, questions and material, and sort them into topics.' : 'Work your trainer posts will appear here.'}
            </p>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.id ?? 'none'}>
            {g.id !== null && (
              <div className="flex items-center justify-between border-b-2 pb-2 mb-1" style={{ borderColor: tone }}>
                <h3 className="text-xl font-semibold" style={{ color: tone }}>{g.name}</h3>
                {cls.can_teach && (
                  <span className="flex gap-1">
                    <button type="button" onClick={() => renameTopic(g)} className="p-1.5 text-gray-400 hover:text-gray-700" title="Rename topic" aria-label={`Rename ${g.name}`}>
                      <Icons.edit size={14} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => removeTopic(g)} className="p-1.5 text-gray-400 hover:text-rose-600" title="Delete topic" aria-label={`Delete ${g.name}`}>
                      <Icons.trash size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
            )}
            {g.items.length === 0 && g.id !== null && <p className="text-[12px] text-gray-400 py-3">Nothing under this topic yet.</p>}
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {g.items.map((i) => {
                const T = typeOf(i.type);
                return (
                  <li key={i.id}>
                    <button type="button" onClick={() => onOpenItem(i.id)}
                      className="w-full flex items-center gap-3 px-2 py-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition">
                      <span className="grid place-items-center h-9 w-9 rounded-full text-white shrink-0" style={{ background: i.type === 'material' ? '#64748b' : tone }}>
                        <T.icon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-gray-800 dark:text-slate-100 truncate">{i.title}</span>
                        <span className="block text-[11px] text-gray-400">
                          {i.type === 'material' ? `Posted ${fmtWhen(i.created_at)}` : fmtDue(i.due_at)}
                          {i.points !== null && i.points !== undefined && i.type !== 'material' ? ` · ${i.points} points` : ''}
                        </span>
                      </span>
                      {cls.can_teach
                        ? i.type !== 'material' && (
                          <span className="hidden sm:flex gap-4 text-center shrink-0">
                            <span><b className="block text-[15px] text-gray-800 dark:text-slate-100">{i.turned_in}</b><span className="text-[10px] text-gray-400">Turned in</span></span>
                            <span><b className="block text-[15px] text-gray-800 dark:text-slate-100">{i.assigned}</b><span className="text-[10px] text-gray-400">Assigned</span></span>
                          </span>
                        )
                        : <span className="shrink-0 text-right">
                            <StatusChip status={i.my_status} />
                            {i.grade !== null && i.grade !== undefined && <span className="block text-[12px] font-bold text-gray-700 dark:text-slate-200 mt-0.5">{i.grade}{i.points ? `/${i.points}` : ''}</span>}
                          </span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {form && (
        <WorkForm cls={cls} topics={data.topics} initial={form}
          onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      )}
    </div>
  );
};

export default ClassworkTab;
