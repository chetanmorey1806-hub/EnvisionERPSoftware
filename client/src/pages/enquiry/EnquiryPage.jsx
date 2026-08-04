import React, { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { enquiryApi } from '../../api/enquiryApi';
import { courseApi } from '../../api/courseApi';
import { usePermissions } from '../../hooks/usePermissions';
import SearchFilter from '../../components/common/SearchFilter';

/* ---------------------------------------------------------------- constants */
const TEMPS = {
  hot: { label: 'Hot', ring: 'ring-rose-200 dark:ring-rose-900', pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400', dot: 'bg-rose-500' },
  warm: { label: 'Warm', ring: 'ring-amber-200 dark:ring-amber-900', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', dot: 'bg-amber-500' },
  cold: { label: 'Cold', ring: 'ring-sky-200 dark:ring-sky-900', pill: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400', dot: 'bg-sky-500' },
};
const STATUS_PILL = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  contacted: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  closed: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
};
const SOURCES = ['walk-in', 'website', 'referral', 'phone', 'social', 'campaign', 'other'];
const EMPTY_LEAD = {
  name: '', phone: '', email: '', course_id: '', qualification: '',
  occupation: '', source: 'walk-in', temperature: 'warm', notes: '',
};

/* ------------------------------------------------------------- small pieces */
const Kpi = ({ label, value, sub, accent = 'text-gray-800 dark:text-slate-100', icon }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm opacity-70">{icon}</span>
    </div>
    <p className={`text-2xl font-black mt-1 ${accent}`}>{value}</p>
    {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
  </div>
);

const Field = ({ label, children, required }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls =
  'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col border border-gray-200 dark:border-slate-800 animate-scale-up">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 dark:text-slate-100 text-sm">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
      {footer && <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">{footer}</div>}
    </div>
  </div>
);

/* -------------------------------------------------------------------- page */
const EnquiryPage = () => {
  const { can } = usePermissions();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [temperature, setTemperature] = useState('');
  const [status, setStatus] = useState('');
  const [dueOnly, setDueOnly] = useState(false);

  // modals
  const [newLead, setNewLead] = useState(null);
  const [callbackFor, setCallbackFor] = useState(null);
  const [callbackAt, setCallbackAt] = useState('');
  const [callbackNote, setCallbackNote] = useState('');
  const [convertFor, setConvertFor] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (search) params.search = search;
    if (temperature) params.temperature = temperature;
    if (status) params.status = status;
    if (dueOnly) params.dueCallbacks = 1;

    Promise.all([enquiryApi.getAll(params), enquiryApi.getStats()])
      .then(([l, s]) => { setLeads(l.data.data || []); setStats(s.data.data); })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load leads.'))
      .finally(() => setLoading(false));
  }, [search, temperature, status, dueOnly]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { courseApi.getAll().then((r) => setCourses(r.data.data || [])).catch(() => {}); }, []);

  const saveLead = async () => {
    setError('');
    try {
      const payload = { ...newLead };
      if (payload.course_id) payload.course_id = Number(payload.course_id);
      else delete payload.course_id;
      await enquiryApi.create(payload);
      setNewLead(null);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to save lead.'); }
  };

  const changeTemp = async (lead, t) => {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, temperature: t } : l)));
    try { await enquiryApi.setTemperature(lead.id, t); load(); } catch { load(); }
  };

  const saveCallback = async () => {
    try {
      await enquiryApi.scheduleCallback(callbackFor.id, {
        callback_at: callbackAt.replace('T', ' ') + ':00',
        note: callbackNote,
      });
      setCallbackFor(null); setCallbackAt(''); setCallbackNote(''); load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to schedule callback.'); }
  };

  const doConvert = async () => {
    setBusyId(convertFor.id);
    try {
      await enquiryApi.convert(convertFor.id, convertFor.course_id ? {} : { course_id: Number(convertFor._course) });
      setConvertFor(null); load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to convert lead.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Growth' }, { label: 'Lead Management' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Lead Management &amp; Admissions</h1>
          <p className="text-xs text-gray-500">Log inquiries, track follow-ups, and convert leads into students.</p>
        </div>
        {can('enquiries.create') && (
          <button
            onClick={() => setNewLead({ ...EMPTY_LEAD })}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition shadow-sm"
          >
            + Log New Lead
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon="👥" label="Total Leads" value={stats?.total ?? '—'} sub={`${stats?.new ?? 0} new`} />
        <Kpi icon="🔥" label="Hot Leads" value={stats?.hot ?? '—'} accent="text-rose-500" sub={`${stats?.warm ?? 0} warm · ${stats?.cold ?? 0} cold`} />
        <Kpi icon="📞" label="Callbacks Due" value={stats?.callbacksDue ?? '—'} accent="text-amber-500" sub={`${stats?.callbacksToday ?? 0} scheduled today`} />
        <Kpi icon="🎓" label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`} accent="text-emerald-500" sub={`${stats?.converted ?? 0} converted`} />
      </div>

      {/* Toolbar — shared search + filter component */}
      <SearchFilter
        value={search}
        onSearch={setSearch}
        placeholder="Search name, phone or email…"
        resultCount={leads.length}
        chips={{
          value: temperature,
          onChange: setTemperature,
          options: Object.entries(TEMPS).map(([k, v]) => ({ value: k, label: v.label })),
        }}
        selects={[{
          key: 'status',
          value: status,
          onChange: setStatus,
          placeholder: 'All statuses',
          options: ['new', 'contacted', 'converted', 'closed'].map((v) => ({ value: v, label: v })),
        }]}
        onClear={() => { setSearch(''); setTemperature(''); setStatus(''); setDueOnly(false); }}
      >
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} className="rounded" />
          Callbacks due
        </label>
      </SearchFilter>

      {/* Lead table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-3xl">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-slate-900/40 text-[10px] uppercase tracking-widest text-gray-400">
                <th className="px-4 py-3 font-bold">Lead</th>
                <th className="px-4 py-3 font-bold">Course Preference</th>
                <th className="px-4 py-3 font-bold">Background</th>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Temperature</th>
                <th className="px-4 py-3 font-bold">Callback</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading leads…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-gray-400">
                  <div className="text-2xl mb-2">🗂️</div>No leads match these filters.
                </td></tr>
              ) : leads.map((l) => {
                const t = TEMPS[l.temperature] || TEMPS.warm;
                const converted = l.status === 'converted';
                return (
                  <tr key={l.id} className={`hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition ${l.callback_due ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${t.dot}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{l.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{l.phone}{l.email ? ` · ${l.email}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{l.course_name || l.course_interest || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                      <p className="truncate max-w-40">{l.qualification || '—'}</p>
                      {l.occupation && <p className="text-[10px] text-gray-400">{l.occupation}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 text-[10px] font-semibold uppercase">{l.source || 'n/a'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.temperature} disabled={converted || !can('enquiries.update')}
                        onChange={(e) => changeTemp(l, e.target.value)}
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase outline-none ring-1 disabled:opacity-60 ${t.pill} ${t.ring}`}
                      >
                        {Object.entries(TEMPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {l.callback_at ? (
                        <span className={`font-medium ${l.callback_due ? 'text-amber-600' : 'text-gray-500'}`}>
                          {l.callback_due && '⏰ '}{new Date(l.callback_at.replace(' ', 'T')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_PILL[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {!converted && can('enquiries.update') && (
                          <button onClick={() => { setCallbackFor(l); setCallbackNote(''); }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                            Callback
                          </button>
                        )}
                        {!converted && can('enquiries.convert') && (
                          <button onClick={() => setConvertFor({ ...l, _course: l.course_id || '' })} disabled={busyId === l.id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60">
                            {busyId === l.id ? '…' : 'Convert'}
                          </button>
                        )}
                        {converted && <span className="text-[11px] text-emerald-600 font-semibold">✓ Enrolled</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- New lead modal ---- */}
      {newLead && (
        <Modal title="Log New Lead" onClose={() => setNewLead(null)}
          footer={<>
            <button onClick={() => setNewLead(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={saveLead} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white">Save Lead</button>
          </>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <input className={inputCls} value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
            </Field>
            <Field label="Phone" required>
              <input className={inputCls} value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
            </Field>
            <Field label="Course preference">
              <select className={inputCls} value={newLead.course_id} onChange={(e) => setNewLead({ ...newLead, course_id: e.target.value })}>
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <Field label="Qualification">
              <input className={inputCls} placeholder="e.g. B.Sc Computer Science"
                value={newLead.qualification} onChange={(e) => setNewLead({ ...newLead, qualification: e.target.value })} />
            </Field>
            <Field label="Occupation">
              <input className={inputCls} placeholder="e.g. Fresher / Working"
                value={newLead.occupation} onChange={(e) => setNewLead({ ...newLead, occupation: e.target.value })} />
            </Field>
            <Field label="Lead source">
              <select className={inputCls} value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Temperature">
              <select className={inputCls} value={newLead.temperature} onChange={(e) => setNewLead({ ...newLead, temperature: e.target.value })}>
                {Object.entries(TEMPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea rows={3} className={inputCls} value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {/* ---- Callback modal ---- */}
      {callbackFor && (
        <Modal title={`Schedule callback — ${callbackFor.name}`} onClose={() => setCallbackFor(null)}
          footer={<>
            <button onClick={() => setCallbackFor(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={saveCallback} disabled={!callbackAt} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50">Schedule</button>
          </>}>
          <div className="space-y-4">
            <Field label="Callback date & time" required>
              <input type="datetime-local" className={inputCls} value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} />
            </Field>
            <Field label="Note">
              <textarea rows={3} className={inputCls} placeholder="What to discuss…" value={callbackNote} onChange={(e) => setCallbackNote(e.target.value)} />
            </Field>
            <p className="text-[11px] text-gray-400">A follow-up entry is logged and the lead moves to <b>contacted</b>.</p>
          </div>
        </Modal>
      )}

      {/* ---- Convert modal ---- */}
      {convertFor && (
        <Modal title="Convert lead to student" onClose={() => setConvertFor(null)}
          footer={<>
            <button onClick={() => setConvertFor(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={doConvert} disabled={!convertFor.course_id && !convertFor._course}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              Convert &amp; Enroll
            </button>
          </>}>
          <div className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-slate-400">
              <b className="text-gray-800 dark:text-slate-100">{convertFor.name}</b> will be registered as a student with a
              generated admission number, and an approved admission record will be created.
            </p>
            {!convertFor.course_id && (
              <Field label="Course (required to convert)" required>
                <select className={inputCls} value={convertFor._course}
                  onChange={(e) => setConvertFor({ ...convertFor, _course: e.target.value })}>
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
            )}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-[11px] text-emerald-700 dark:text-emerald-400">
              This action is one-click and irreversible — the lead is marked <b>converted</b>.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EnquiryPage;
