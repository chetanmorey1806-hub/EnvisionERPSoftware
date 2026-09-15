import React, { useCallback, useEffect, useState } from 'react';
import { usePersistedState } from '../../hooks/useListState';
import { Link, useNavigate } from 'react-router-dom';
import { PageHero } from '../../components/common/PageShell';
import ExcelTools from '../../components/common/ExcelTools';
import EmptyState from '../../components/common/EmptyState';
import { Icons } from '../../components/common/icons';
import { partnerApi } from '../../api/partnerApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

const TYPE_BADGE = {
  hiring: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400',
  training: 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400',
  both: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
};

const TYPE_LABEL = { hiring: 'Hiring', training: 'Training', both: 'Hiring + Training' };

/**
 * Corporate partners — the companies the institute invoices for corporate
 * training and places students into. Same List → New → Edit flow as the rest of
 * the master data.
 */
const PartnersPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const navigate = useNavigate();

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistedState('partners:search', '');
  const [query, setQuery] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(null);      // partner id whose contacts are open
  const [contacts, setContacts] = useState({});        // id -> contact[]
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    partnerApi.getAll({ search: query || undefined, deleted: deleted ? 1 : undefined })
      .then((r) => setPartners(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load partners.'))
      .finally(() => setLoading(false));
  }, [query, deleted]);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };

  const toggleContacts = async (p) => {
    if (expanded === p.id) { setExpanded(null); return; }
    setExpanded(p.id);
    if (!contacts[p.id]) {
      try {
        const r = await partnerApi.contacts(p.id);
        setContacts((c) => ({ ...c, [p.id]: r.data.data || [] }));
      } catch { setContacts((c) => ({ ...c, [p.id]: [] })); }
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`${t('Move to Deleted?')} "${p.name}"`)) return;
    try {
      const r = await partnerApi.delete(p.id);
      flash(r.data.message);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to delete.'); }
  };

  const restore = async (p) => {
    try {
      const r = await partnerApi.restore(p.id);
      flash(r.data.message);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to restore.'); }
  };

  const dash = <span className="text-gray-300">—</span>;

  return (
    <div className="space-y-5">
      <PageHero
        tone="brand"
        icon={Icons.team}
        title="Corporate Partners"
        subtitle="Companies that sponsor training and hire our students."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="partners"
              rows={partners}
              onCreate={can('partners.create') ? partnerApi.create : undefined}
              onDone={load}
              variant="hero"
            />
            <button
              onClick={() => setDeleted((d) => !d)}
              className={`erp-hero-btn px-4 py-2.5 min-h-11 ${deleted ? 'bg-white/35' : ''}`}
            >
              <Icons.trash size={15} aria-hidden="true" /> {deleted ? t('Back to active') : t('Deleted')}
            </button>
            {can('partners.create') && !deleted && (
              <Link to="/partners/new" className="erp-hero-btn px-4 py-2.5 min-h-11">
                <Icons.plus size={15} aria-hidden="true" /> {t('Add Partner')}
              </Link>
            )}
          </div>
        )}
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {notice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-2">
          <Icons.success size={14} /> {notice}
        </div>
      )}

      {deleted && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
          {t('Showing deleted partners. Their invoices and placements are kept — restore a partner to use it again.')}
        </div>
      )}

      {/* search */}
      <div className="relative max-w-lg">
        <Icons.search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search by company, PAN, GSTIN or city…')}
          className="w-full pl-9 pr-3 py-2.5 min-h-11 text-xs rounded-lg bg-white dark:bg-slate-900
                     border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100
                     focus:ring-2 focus:ring-brand-500/40 outline-none"
        />
      </div>

      {/* table (desktop) / cards (mobile) */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <EmptyState
          icon={Icons.team}
          title={deleted ? 'No deleted partners' : query ? 'No partners match that search' : 'No partners yet'}
          description={deleted
            ? 'Partners you delete will appear here, ready to restore.'
            : 'Add the companies that sponsor corporate batches or hire your students.'}
          actionLabel={can('partners.create') && !deleted && !query ? 'Add Partner' : undefined}
          onAction={can('partners.create') && !deleted && !query ? () => navigate('/partners/new') : undefined}
        />
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/70 dark:bg-slate-950/40 border-b border-gray-100 dark:border-slate-800">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-left">
                  <th className="px-4 py-3 w-32">#</th>
                  <th className="px-4 py-3">{t('Company')}</th>
                  <th className="px-4 py-3">{t('PAN')}</th>
                  <th className="px-4 py-3">{t('GSTIN')}</th>
                  <th className="px-4 py-3">{t('Corporate office')}</th>
                  <th className="px-4 py-3">{t('Training venue')}</th>
                  <th className="px-4 py-3 text-right">{t('Contacts')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                {partners.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          {deleted ? (
                            can('partners.update') && (
                              <button onClick={() => restore(p)} title={t('Restore')}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 press">
                                <Icons.success size={13} />
                              </button>
                            )
                          ) : (
                            <>
                              {can('partners.update') && (
                                <button onClick={() => navigate(`/partners/${p.id}/edit`)} title={t('Edit')}
                                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-brand-600 hover:border-brand-300 press">
                                  <Icons.edit size={13} />
                                </button>
                              )}
                              <button onClick={() => toggleContacts(p)} title={t('Contacts')}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-brand-600 hover:border-brand-300 press">
                                <Icons.menu size={13} />
                              </button>
                              {can('partners.delete') && (
                                <button onClick={() => remove(p)} title={t('Delete')}
                                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-rose-600 hover:border-rose-300 press">
                                  <Icons.trash size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid place-items-center h-8 w-8 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
                            <Icons.team size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-gray-800 dark:text-slate-100 truncate uppercase">
                              {p.name}
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">#{p.id}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${TYPE_BADGE[p.partner_type]}`}>
                                {t(TYPE_LABEL[p.partner_type])}
                              </span>
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[11px] font-mono text-gray-600 dark:text-slate-300">{p.pan || dash}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-gray-600 dark:text-slate-300">{p.gst || dash}</td>

                      <td className="px-4 py-3 text-[11px] text-gray-600 dark:text-slate-300">
                        {p.corp_city || p.corp_state ? (
                          <span className="inline-flex items-center gap-1 uppercase">
                            <Icons.team size={11} className="text-gray-400" />
                            {[p.corp_city, p.corp_state].filter(Boolean).join(', ')}
                          </span>
                        ) : dash}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-gray-600 dark:text-slate-300 max-w-48 truncate">
                        {p.venue_address || dash}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toggleContacts(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold
                                     bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 press">
                          <Icons.students size={12} /> {p.contact_count}
                          <Icons.chevronDown size={11} className={expanded === p.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                      </td>
                    </tr>

                    {expanded === p.id && (
                      <tr className="bg-gray-50/70 dark:bg-slate-950/40">
                        <td colSpan={7} className="px-4 py-3">
                          {!contacts[p.id] ? (
                            <p className="text-xs text-gray-400">{t('Loading…')}</p>
                          ) : contacts[p.id].length === 0 ? (
                            <p className="text-xs text-gray-400">
                              {t('No contacts yet — add them from the partner form.')}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                              {contacts[p.id].map((c) => (
                                <div key={c.id}
                                  className="p-2.5 rounded-lg erp-card">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{c.name}</span>
                                    {!!c.is_primary && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                                        {t('PRIMARY')}
                                      </span>
                                    )}
                                  </div>
                                  {c.designation && <p className="text-[10px] text-gray-400">{c.designation}</p>}
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                                    {c.phone && <a href={`tel:${c.phone}`} className="hover:text-brand-600">{c.phone}</a>}
                                    {c.email && <a href={`mailto:${c.email}`} className="hover:text-brand-600 truncate">{c.email}</a>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="lg:hidden divide-y divide-gray-50 dark:divide-slate-800/60">
            {partners.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate uppercase">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">#{p.id}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {deleted ? (
                      can('partners.update') && (
                        <button onClick={() => restore(p)} className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 press">
                          <Icons.success size={15} />
                        </button>
                      )
                    ) : (
                      <>
                        {can('partners.update') && (
                          <button onClick={() => navigate(`/partners/${p.id}/edit`)} className="p-2 rounded-lg text-gray-400 hover:text-brand-600 press">
                            <Icons.edit size={15} />
                          </button>
                        )}
                        {can('partners.delete') && (
                          <button onClick={() => remove(p)} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 press">
                            <Icons.trash size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <div><dt className="text-[10px] font-bold uppercase text-gray-400">{t('PAN')}</dt>
                    <dd className="text-xs font-mono text-gray-700 dark:text-slate-300">{p.pan || '—'}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase text-gray-400">{t('GSTIN')}</dt>
                    <dd className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{p.gst || '—'}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase text-gray-400">{t('Corporate office')}</dt>
                    <dd className="text-xs text-gray-700 dark:text-slate-300">
                      {[p.corp_city, p.corp_state].filter(Boolean).join(', ') || '—'}
                    </dd></div>
                  <div><dt className="text-[10px] font-bold uppercase text-gray-400">{t('Contacts')}</dt>
                    <dd><button onClick={() => toggleContacts(p)} className="text-xs font-bold text-brand-600 press">
                      {p.contact_count} {t('contacts')}
                    </button></dd></div>
                </dl>

                {expanded === p.id && contacts[p.id]?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {contacts[p.id].map((c) => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                        <p className="text-xs font-bold text-gray-800 dark:text-slate-100">
                          {c.name} {!!c.is_primary && <span className="text-[9px] text-emerald-600">({t('PRIMARY')})</span>}
                        </p>
                        <p className="text-[10px] text-gray-500">{[c.designation, c.phone, c.email].filter(Boolean).join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && partners.length > 0 && (
        <p className="text-xs text-gray-400">
          {t('Showing')} <b>{partners.length}</b> {partners.length === 1 ? t('partner') : t('partners')}
        </p>
      )}
    </div>
  );
};

export default PartnersPage;
