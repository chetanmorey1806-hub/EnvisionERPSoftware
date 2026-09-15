import React, { useState } from 'react';
import ExcelTools from '../../components/common/ExcelTools';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { PageHeader, Empty, Flash, Table, Btn, useList, Loading } from '../../components/common/PageKit';
import { libraryApi } from '../../api/libraryApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** The book catalogue. Copies out on loan are tracked against each title. */
const LibraryPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const [q, setQ] = useState('');
  const L = useList(() => libraryApi.searchBooks());
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await libraryApi.addBook({ ...form, total_copies: Number(form.total_copies || 1) });
      L.flash(t('Book added.'));
      setForm(null);
      L.load();
    } catch (e) { L.fail(e); } finally { setBusy(false); }
  };

  const shown = L.items.filter((b) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [b.title, b.author, b.isbn, b.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
  });

  return (
    <div className="space-y-4">
      <PageHeader tone="cyan" icon={<Icons.library size={18} />} title="Library"
        subtitle="Books and courseware, and how many copies are on the shelf right now."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="library"
              rows={L.items}
              onCreate={can('library.create') ? libraryApi.addBook : undefined}
              onDone={L.load}
              variant="hero"
            />
            {can('library.create') && (
              <button
                onClick={() => setForm({ title: '', author: '', isbn: '', category: '', total_copies: 1 })}
                className="erp-hero-btn px-4 py-2.5 min-h-11"
              >
                <Icons.plus size={15} aria-hidden="true" /> {t('Add book')}
              </button>
            )}
          </div>
        )} />
      <Flash error={L.error} notice={L.notice} />

      {L.items.length > 0 && (
        <input className={`${inputClsCompact} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search by title, author or ISBN…')} />
      )}

      {L.loading ? <Loading /> : L.items.length === 0 ? (
        <Empty title="The library is empty" hint="Add your first title. Copies on loan are tracked automatically as books are issued." />
      ) : shown.length === 0 ? (
        <Empty title="No book matches that search" hint="Try a different title, author or ISBN." />
      ) : (
        <Table headers={['Title', 'Author', 'ISBN', 'Category', 'Available']}>
          {shown.map((b) => (
            <tr key={b.id} className="bg-white dark:bg-slate-900">
              <td className="px-3 py-2 font-bold text-gray-900 dark:text-slate-100">{b.title}</td>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{b.author || '—'}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{b.isbn || '—'}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{b.category || '—'}</td>
              <td className="px-3 py-2">
                <span className={`font-bold ${Number(b.available_copies) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {b.available_copies}
                </span>
                <span className="text-gray-400"> / {b.total_copies}</span>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {form && (
        <Modal isOpen size="md" title={t('Add book')} onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={save} disabled={busy || !form.title}
              className="erp-btn-primary px-4 py-2.5 text-xs">
              {busy ? t('Saving…') : t('Save')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" required className="col-span-2">
              <input className={inputClsCompact} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Author"><input className={inputClsCompact} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
            <Field label="ISBN"><input className={inputClsCompact} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></Field>
            <Field label="Category"><input className={inputClsCompact} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Copies"><input type="number" min="1" className={inputClsCompact} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LibraryPage;
