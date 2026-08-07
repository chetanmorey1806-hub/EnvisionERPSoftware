import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icons } from '../../components/common/icons';
import EmptyState from '../../components/common/EmptyState';
import { documentApi, saveBlob } from '../../api/documentApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';
import UploadModal from './UploadModal';
import FolderModal from './FolderModal';
import ShareModal from './ShareModal';
import { FileIcon, formatSize } from './fileKind';
import { PageHero } from '../../components/common/PageShell';

const TABS = [
  { key: 'all', label: 'All Files', icon: Icons.folder, adminOnly: true },
  { key: 'mine', label: 'My Files', icon: Icons.folder },
  { key: 'withMe', label: 'Shared with me', icon: Icons.team },
  { key: 'byMe', label: 'Shared by me', icon: Icons.share },
];

const TYPE_CHIPS = [
  { value: '', label: 'All' },
  { value: 'folder', label: 'Folders' },
  { value: 'file', label: 'Files' },
];

const ROWS_OPTIONS = [10, 25, 50, 100];

const DocumentVault = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const isAdmin = can('documents.manage');

  const [tab, setTab] = useState(isAdmin ? 'all' : 'mine');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');       // debounced
  const [tag, setTag] = useState('');
  const [ownerId, setOwnerId] = useState('');

  const [folderId, setFolderId] = useState(null);   // current folder (My Files)
  const [trail, setTrail] = useState([]);           // breadcrumb

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [shares, setShares] = useState([]);
  const [tags, setTags] = useState([]);
  const [owners, setOwners] = useState([]);

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(25);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [upload, setUpload] = useState(false);
  const [folderModal, setFolderModal] = useState(null);   // {mode:'new'|'rename', folder?}
  const [shareTarget, setShareTarget] = useState(null);   // {itemType,itemId,name}

  // Debounce the search box so a keystroke doesn't fire a request.
  useEffect(() => {
    const id = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };

  // ---- loading -------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'all') {
        const r = await documentApi.allFiles({
          search: query, tag, type, userId: ownerId || undefined, page, limit: rows,
        });
        const items = r.data.data || [];
        setFolders(items.filter((i) => i.kind === 'folder'));
        setFiles(items.filter((i) => i.kind === 'file'));
        setTotal(r.data.meta?.total || 0);
        setShares([]);
      } else if (tab === 'mine') {
        const [fo, fi] = await Promise.all([
          type === 'file' ? Promise.resolve({ data: { data: [] } }) : documentApi.listFolders(folderId || undefined),
          type === 'folder' ? Promise.resolve({ data: { data: [] } }) : documentApi.listFiles({ folderId: folderId || undefined, search: query, tag }),
        ]);
        // Searching or tag-filtering spans the whole vault, so folders (which
        // carry no tags) drop out of a tag-filtered result.
        setFolders(tag ? [] : (fo.data.data || []));
        setFiles(fi.data.data || []);
        setShares([]);
        setTotal((tag ? 0 : (fo.data.data || []).length) + (fi.data.data || []).length);
      } else {
        const r = tab === 'withMe' ? await documentApi.sharedWithMe() : await documentApi.sharedByMe();
        setShares(r.data.data || []);
        setFolders([]); setFiles([]);
        setTotal((r.data.data || []).length);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load the vault.');
    } finally {
      setLoading(false);
    }
  }, [tab, query, tag, type, ownerId, page, rows, folderId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    documentApi.tags(isAdmin && tab === 'all' ? 'all' : undefined)
      .then((r) => setTags(r.data.data?.tags || [])).catch(() => {});
  }, [isAdmin, tab, files.length]);

  useEffect(() => {
    if (isAdmin) documentApi.owners().then((r) => setOwners(r.data.data || [])).catch(() => {});
  }, [isAdmin]);

  // Breadcrumb for the folder we're inside.
  useEffect(() => {
    if (!folderId) { setTrail([]); return; }
    documentApi.breadcrumb(folderId).then((r) => setTrail(r.data.data || [])).catch(() => setTrail([]));
  }, [folderId]);

  // ---- actions -------------------------------------------------------------
  const openFolder = (f) => {
    if (tab !== 'mine') return;      // admin/share views are flat lists
    setFolderId(f.id); setPage(1); setSearch(''); setQuery('');
  };

  const doDownload = async (file) => {
    try {
      const r = await documentApi.download(file.id);
      saveBlob(r.data, file.file_name || file.name);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to download this file.');
    }
  };

  const doPreview = async (file) => {
    try {
      const r = await documentApi.view(file.id);
      window.open(URL.createObjectURL(r.data), '_blank', 'noopener');
    } catch {
      setError('Unable to preview this file.');
    }
  };

  const removeFile = async (file) => {
    if (!window.confirm(`${t('Delete')} "${file.name}"?`)) return;
    try {
      await documentApi.deleteFile(file.id);
      flash(`"${file.name}" ${t('deleted')}.`);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to delete.'); }
  };

  const removeFolder = async (folder) => {
    if (!window.confirm(`${t('Delete folder and everything inside it?')} "${folder.name}"`)) return;
    try {
      await documentApi.deleteFolder(folder.id);
      flash(`"${folder.name}" ${t('deleted')}.`);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to delete.'); }
  };

  const revoke = async (share) => {
    try {
      await documentApi.revokeShare(share.share_id);
      flash(t('Access revoked.'));
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to revoke.'); }
  };

  const clearFilters = () => {
    setSearch(''); setQuery(''); setTag(''); setType(''); setOwnerId(''); setPage(1);
  };

  const pages = Math.max(1, Math.ceil(total / rows) || 1);
  const showing = tab === 'all'
    ? { from: total ? (page - 1) * rows + 1 : 0, to: Math.min(page * rows, total) }
    : { from: total ? 1 : 0, to: total };

  const isEmpty = !loading && !folders.length && !files.length && !shares.length;
  const activeFilters = useMemo(
    () => (query ? 1 : 0) + (tag ? 1 : 0) + (type ? 1 : 0) + (ownerId ? 1 : 0),
    [query, tag, type, ownerId]
  );

  const visibleTabs = TABS.filter((x) => !x.adminOnly || isAdmin);

  return (
    <div className="space-y-5">
      <PageHero
        tone="brand"
        icon={Icons.folder}
        title="Document Vault"
        subtitle="Your private documents — upload, organize, tag & share securely."
        action={can('documents.create') && (
          <div className="flex gap-2">
            <button onClick={() => setFolderModal({ mode: 'new' })} className="erp-hero-btn px-4 py-2.5 min-h-11">
              <Icons.plus size={15} aria-hidden="true" /> {t('New Folder')}
            </button>
            <button
              onClick={() => setUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-[11px] font-bold rounded-xl bg-white text-gray-900 shadow-sm hover:bg-white/90 press"
            >
              <Icons.upload size={15} aria-hidden="true" /> {t('Upload')}
            </button>
          </div>
        )}
      />

      {/* ---- tabs ---- */}
      <div className="erp-tabs">
        {visibleTabs.map((x) => {
          const TabIcon = x.icon;
          const on = tab === x.key;
          return (
            <button key={x.key}
              onClick={() => { setTab(x.key); setFolderId(null); setPage(1); clearFilters(); }}
              className={`erp-tab ${on ? 'erp-tab-active' : ''}`}>
              <TabIcon size={15} aria-hidden="true" /> {t(x.label)}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs flex items-center gap-2">
          <Icons.warning size={14} /> {error}
        </div>
      )}
      {notice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-2">
          <Icons.success size={14} /> {notice}
        </div>
      )}

      {/* ---- filters ---- */}
      {tab !== 'withMe' && tab !== 'byMe' && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-1.5">
            {TYPE_CHIPS.map((c) => (
              <button key={c.value} onClick={() => { setType(c.value); setPage(1); }}
                className={`px-3.5 py-2 min-h-9 rounded-lg text-[11px] font-bold transition press ${
                  type === c.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
                }`}>
                {t(c.label)}
              </button>
            ))}
          </div>

          {isAdmin && tab === 'all' && (
            <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setPage(1); }}
              className="px-3 py-2 min-h-9 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                         text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none lg:w-44">
              <option value="">{t('All users')}</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}

          <div className="relative lg:ml-auto lg:max-w-xs w-full">
            <Icons.search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search folders & files by name…')}
              className="w-full pl-9 pr-8 py-2 min-h-9 text-xs rounded-lg bg-white dark:bg-slate-900
                         border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100
                         focus:ring-2 focus:ring-brand-500/40 outline-none"
            />
          </div>
        </div>
      )}

      {/* ---- tag chips ---- */}
      {tab !== 'withMe' && tab !== 'byMe' && tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <Icons.filter size={12} /> {t('Tags')}:
          </span>
          {tags.map((x) => (
            <button key={x.name} onClick={() => { setTag(tag === x.name ? '' : x.name); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition press ${
                tag === x.name
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}>
              {t(x.name)}{x.count > 0 ? ` (${x.count})` : ''}
            </button>
          ))}
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="text-[11px] font-bold text-brand-600 hover:underline press">
              {t('Clear')} ({activeFilters})
            </button>
          )}
        </div>
      )}

      {/* ---- breadcrumb (inside a folder) ---- */}
      {tab === 'mine' && folderId && (
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => setFolderId(null)} className="font-semibold text-brand-600 hover:underline press">
            {t('My Files')}
          </button>
          {trail.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1.5">
              <span className="text-gray-300">/</span>
              {i === trail.length - 1 ? (
                <span className="font-bold text-gray-700 dark:text-slate-200">{f.name}</span>
              ) : (
                <button onClick={() => setFolderId(f.id)} className="font-semibold text-brand-600 hover:underline press">
                  {f.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ---- grid ---- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Icons.admissions}
          title={activeFilters ? 'Nothing matches those filters' : 'Your vault is empty'}
          description={activeFilters
            ? 'Try clearing the search, tag or type filter.'
            : 'Upload a file or create a folder to get started.'}
          actionLabel={can('documents.create') && !activeFilters ? 'Upload' : undefined}
          onAction={can('documents.create') && !activeFilters ? () => setUpload(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 stagger">
          {/* folders */}
          {folders.map((f, i) => (
            <div key={`fo-${f.id}`} style={{ '--i': i }}
              className="group relative p-3 rounded-xl erp-card
                         hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-md transition cursor-pointer">
              <button onClick={() => openFolder(f)} className="w-full flex items-center gap-2.5 text-left min-w-0">
                <Icons.folder size={22} className="shrink-0 text-amber-500" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{f.name}</span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {f.owner_name || t('You')}
                    {f.file_count != null ? ` · ${f.file_count} ${t('files')}` : ''}
                  </span>
                </span>
              </button>

              <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5
                              erp-card">
                {can('documents.share') && tab === 'mine' && (
                  <button onClick={() => setShareTarget({ itemType: 'folder', itemId: f.id, name: f.name })}
                    title={t('Share')} className="p-1.5 rounded text-gray-400 hover:text-brand-600 press">
                    <Icons.share size={13} />
                  </button>
                )}
                {tab === 'mine' && can('documents.update') && (
                  <button onClick={() => setFolderModal({ mode: 'rename', folder: f })}
                    title={t('Rename')} className="p-1.5 rounded text-gray-400 hover:text-brand-600 press">
                    <Icons.edit size={13} />
                  </button>
                )}
                {tab === 'mine' && can('documents.delete') && (
                  <button onClick={() => removeFolder(f)}
                    title={t('Delete')} className="p-1.5 rounded text-gray-400 hover:text-rose-600 press">
                    <Icons.trash size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* files */}
          {files.map((f, i) => (
            <div key={`fi-${f.id}`} style={{ '--i': folders.length + i }}
              className="group relative p-3 rounded-xl erp-card
                         hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-md transition">
              <button onClick={() => doPreview(f)} className="w-full flex items-center gap-2.5 text-left min-w-0">
                <FileIcon ext={f.ext} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{f.name}</span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {f.owner_name || t('You')}{f.file_size ? ` · ${formatSize(f.file_size)}` : ''}
                  </span>
                </span>
              </button>

              {f.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.tags.slice(0, 2).map((x) => (
                    <span key={x} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">
                      {x}
                    </span>
                  ))}
                  {f.tags.length > 2 && <span className="text-[9px] text-gray-400">+{f.tags.length - 2}</span>}
                </div>
              )}

              <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5
                              erp-card">
                <button onClick={() => doDownload(f)} title={t('Download')}
                  className="p-1.5 rounded text-gray-400 hover:text-brand-600 press">
                  <Icons.download size={13} />
                </button>
                {can('documents.share') && tab === 'mine' && (
                  <button onClick={() => setShareTarget({ itemType: 'file', itemId: f.id, name: f.name })}
                    title={t('Share')} className="p-1.5 rounded text-gray-400 hover:text-brand-600 press">
                    <Icons.share size={13} />
                  </button>
                )}
                {tab === 'mine' && can('documents.delete') && (
                  <button onClick={() => removeFile(f)} title={t('Delete')}
                    className="p-1.5 rounded text-gray-400 hover:text-rose-600 press">
                    <Icons.trash size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* shares (Shared with me / by me) */}
          {shares.map((s, i) => (
            <div key={`sh-${s.share_id}`} style={{ '--i': i }}
              className="group relative p-3 rounded-xl erp-card
                         hover:shadow-md transition">
              <div className="flex items-center gap-2.5 min-w-0">
                {s.item_type === 'folder'
                  ? <Icons.folder size={22} className="shrink-0 text-amber-500" />
                  : <FileIcon ext={s.ext} />}
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{s.item_name}</span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {tab === 'withMe' ? `${t('from')} ${s.owner_name}` : `${t('with')} ${s.shared_with_name}`}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  s.access_level === 'download'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  {t(s.access_level)}
                </span>
                {tab === 'withMe' && s.item_type === 'file' && (
                  <button onClick={() => doDownload({ id: s.item_id, name: s.item_name, file_name: s.item_name })}
                    className="text-[10px] font-bold text-brand-600 hover:underline press">
                    {t('Open')}
                  </button>
                )}
                {tab === 'byMe' && (
                  <button onClick={() => revoke(s)}
                    className="text-[10px] font-bold text-rose-600 hover:underline press">
                    {t('Revoke')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- footer / pagination ---- */}
      {!loading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl
                        erp-card">
          <p className="text-xs text-gray-500">
            {t('Showing')} <b>{showing.from}–{showing.to}</b> {t('of')} <b>{total}</b>
          </p>

          {tab === 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('Rows')}</span>
              <select value={rows} onChange={(e) => { setRows(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                {ROWS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>

              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 press">
                  <Icons.chevronDown size={14} className="rotate-90" />
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold">{page}</span>
                <span className="text-xs text-gray-400">/ {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 press">
                  <Icons.chevronDown size={14} className="-rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- modals ---- */}
      {upload && (
        <UploadModal
          folderId={folderId}
          tags={tags}
          onClose={() => setUpload(false)}
          onDone={(msg) => { setUpload(false); flash(msg); load(); }}
        />
      )}
      {folderModal && (
        <FolderModal
          mode={folderModal.mode}
          folder={folderModal.folder}
          parentId={folderId}
          onClose={() => setFolderModal(null)}
          onDone={(msg) => { setFolderModal(null); flash(msg); load(); }}
        />
      )}
      {shareTarget && (
        <ShareModal
          target={shareTarget}
          onClose={() => setShareTarget(null)}
          onDone={(msg) => { setShareTarget(null); flash(msg); load(); }}
        />
      )}
    </div>
  );
};

export default DocumentVault;
