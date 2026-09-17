import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Icons } from '../common/icons';
import { AuthContext } from '../../context/AuthContext';
import { classApi } from '../../api/classApi';
import {
  Avatar, CommentList, FileLink, fmtWhen, inputCls, themeColor, typeOf, useToast, errText,
} from './classKit';

/** Stream — announcements with class comments, plus a line for each new piece of work. */
const StreamTab = ({ cls, refreshKey, onOpenItem }) => {
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    classApi.stream(cls.id).then((r) => setData(r.data.data)).catch((e) => toast(errText(e, 'Could not load the stream.'), 'error'));
  }, [cls.id, toast]);
  useEffect(load, [load, refreshKey]);

  const post = async () => {
    setPosting(true);
    try {
      await classApi.announce(cls.id, { body, file });
      setBody(''); setFile(null); setComposing(false); load();
      toast('Announcement posted', 'success');
    } catch (e) { toast(errText(e, 'Could not post.'), 'error'); } finally { setPosting(false); }
  };

  const removeAnn = async (a) => {
    if (!window.confirm('Delete this announcement and its comments?')) return;
    try { await classApi.removeAnnouncement(cls.id, a.id); load(); } catch (e) { toast(errText(e, 'Could not delete.'), 'error'); }
  };

  if (!data) return <div className="erp-card h-40 animate-pulse" />;
  const me = user?.id;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        {cls.can_teach && (
          <div className="erp-card p-4">
            <p className="text-[12px] font-semibold text-gray-500">Class code</p>
            <p className="font-mono text-xl font-bold tracking-widest mt-1" style={{ color: themeColor(cls.theme) }}>{cls.class_code}</p>
            <p className="text-[11px] text-gray-400 mt-1">{cls.join_enabled ? 'Students can join with this code.' : 'Joining with the code is off.'}</p>
          </div>
        )}
        <div className="erp-card p-4">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100 mb-2">Upcoming</p>
          {data.upcoming.length === 0 ? (
            <p className="text-[12px] text-gray-400">Woohoo, no work due soon!</p>
          ) : (
            <ul className="space-y-2">
              {data.upcoming.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => onOpenItem(u.id)} className="text-left w-full group">
                    <span className="block text-[11px] text-gray-400">Due {fmtWhen(u.due_at)}</span>
                    <span className="block text-[12px] text-gray-700 dark:text-slate-200 group-hover:underline truncate">{u.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="space-y-3 min-w-0">
        {cls.can_teach && (
          <div className="erp-card p-4">
            {!composing ? (
              <button type="button" onClick={() => setComposing(true)} className="flex items-center gap-3 w-full text-left">
                <Avatar name={user?.name} size={36} tone={themeColor(cls.theme)} />
                <span className="text-[13px] text-gray-500 hover:text-gray-800 dark:hover:text-slate-200">Announce something to your class</span>
              </button>
            ) : (
              <div className="space-y-3">
                <textarea autoFocus rows={4} className={`${inputCls} resize-y`} maxLength={5000}
                  placeholder="Announce something to your class" value={body} onChange={(e) => setBody(e.target.value)} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="erp-btn erp-btn-outline text-xs px-3 py-2 cursor-pointer">
                    <Icons.upload size={13} aria-hidden="true" /> {file ? file.name.slice(0, 28) : 'Attach file'}
                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className="erp-btn erp-btn-soft text-xs px-4 py-2" onClick={() => { setComposing(false); setBody(''); setFile(null); }}>Cancel</button>
                    <button type="button" className="erp-btn erp-btn-primary text-xs px-4 py-2" disabled={posting || !body.trim()} onClick={post}>
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {data.posts.length === 0 && (
          <div className="erp-card p-8 text-center text-[13px] text-gray-500">
            This is where you will see announcements and new classwork.
          </div>
        )}

        {data.posts.map((p) => (p.kind === 'classwork' ? (
          <button key={`w${p.id}`} type="button" onClick={() => onOpenItem(p.id)}
            className="erp-card w-full p-4 flex items-center gap-3 text-left hover:shadow-md transition">
            <span className="grid place-items-center h-10 w-10 rounded-full text-white shrink-0" style={{ background: themeColor(cls.theme) }}>
              {React.createElement(typeOf(p.type).icon, { size: 18, 'aria-hidden': true })}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] text-gray-800 dark:text-slate-100 truncate">
                {p.author_name || 'Your trainer'} posted a new {typeOf(p.type).label.toLowerCase()}: <b>{p.title}</b>
              </span>
              <span className="block text-[11px] text-gray-400">{fmtWhen(p.created_at)}</span>
            </span>
          </button>
        ) : (
          <article key={`a${p.id}`} className="erp-card overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={p.author_name} size={36} tone={themeColor(cls.theme)} />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100">{p.author_name || 'Someone'}</p>
                    <p className="text-[11px] text-gray-400">{fmtWhen(p.created_at)}</p>
                  </div>
                </div>
                {(cls.can_teach || p.user_id === me) && (
                  <button type="button" onClick={() => removeAnn(p)} className="p-1.5 text-gray-400 hover:text-rose-600" title="Delete" aria-label="Delete announcement">
                    <Icons.trash size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="text-[14px] text-gray-800 dark:text-slate-200 whitespace-pre-wrap break-words">{p.body}</p>
              <FileLink url={p.file_url} name={p.file_name} size={p.size_kb} />
            </div>
            <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-3">
              {p.comments.length > 0 && (
                <p className="text-[12px] font-semibold text-gray-500 mb-2">
                  {p.comments.length} class comment{p.comments.length === 1 ? '' : 's'}
                </p>
              )}
              <CommentList
                compact
                comments={p.comments}
                canDelete={(c) => cls.can_teach || c.user_id === me}
                onDelete={async (c) => { await classApi.removeComment(cls.id, c.id); load(); }}
                onAdd={async (text) => {
                  try { await classApi.comment(cls.id, { announcement_id: p.id, body: text }); load(); }
                  catch (e) { toast(errText(e, 'Could not post the comment.'), 'error'); throw e; }
                }}
              />
            </div>
          </article>
        )))}
      </div>
    </div>
  );
};

export default StreamTab;
