import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import { PageHero } from '../../components/common/PageShell';
import ExcelTools from '../../components/common/ExcelTools';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { feeApi } from '../../api/feeApi';
import { studentApi } from '../../api/studentApi';
import { courseApi } from '../../api/courseApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * Finance — the four things an admin does with money:
 *   Dues     · who owes what, and take the payment
 *   Plans    · what a course costs, and put a student on one
 *   Expenses · what went out
 *   P&L      · did we make anything
 *
 * Every rupee shown here is computed by the server. Nothing on this page adds
 * up a total locally — the client's arithmetic is not the institute's.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const shortDate = (d) =>
  (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

const PILL = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  pending: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  waived: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
};

const Pill = ({ s }) => {
  const { t } = useT();
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${PILL[s] || PILL.pending}`}>
      {t(s)}
    </span>
  );
};

const Stat = ({ label, value, tone = 'gray', hint }) => {
  const { t } = useT();
  const tones = {
    gray: 'text-gray-900 dark:text-slate-100',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="p-4 rounded-xl erp-card">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t(label)}</p>
      <p className={`text-xl font-extrabold mt-1 ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{t(hint)}</p>}
    </div>
  );
};

const TABS = [
  { key: 'dues', label: 'Dues', perm: 'fees.manage' },
  { key: 'plans', label: 'Fee plans', perm: 'fees.view' },
  { key: 'expenses', label: 'Expenses', perm: 'expenses.view' },
  { key: 'pnl', label: 'Profit & loss', perm: 'expenses.view' },
];

const FeesPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const visibleTabs = useMemo(() => TABS.filter((x) => can(x.perm)), [can]);
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'dues');

  const [dues, setDues] = useState([]);
  const [plans, setPlans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const [collect, setCollect] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [assign, setAssign] = useState(null);
  const [expForm, setExpForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 3500); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [d, p, e, l] = await Promise.all([
        can('fees.manage') ? feeApi.getPendingDues() : Promise.resolve({ data: { data: [] } }),
        feeApi.getPlans().catch(() => ({ data: { data: [] } })),
        can('expenses.view') ? feeApi.getExpenses() : Promise.resolve({ data: { data: [] } }),
        can('expenses.view') ? feeApi.getProfitAndLoss() : Promise.resolve({ data: { data: null } }),
      ]);
      setDues(d.data.data || []);
      setPlans(p.data.data || []);
      setExpenses(e.data.data || []);
      setPnl(l.data.data || null);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const loadLookups = async () => {
    if (students.length) return;
    try {
      const [s, c] = await Promise.all([studentApi.getAll(), courseApi.getAll()]);
      setStudents(s.data.data?.items || s.data.data || []);
      setCourses(c.data.data?.items || c.data.data || []);
    } catch { /* the selects just stay empty */ }
  };

  const openCollect = async (studentId) => {
    setBusy(true);
    try {
      const r = await feeApi.getStudentStructure(studentId);
      setLedger(r.data.data);
      setCollect({ student_id: studentId, amount: '', mode: 'cash', reference_no: '' });
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doCollect = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await feeApi.collectPayment({ ...collect, amount: Number(collect.amount) });
      flash(`${t('Receipt')} ${r.data.data.receipt_no} — ${inr(collect.amount)} ${t('collected')}.`);
      setCollect(null);
      setLedger(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doSweep = async () => {
    setBusy(true);
    try {
      const d = (await feeApi.sweep()).data.data;
      flash(`${t('Overdue check done')}: ${d.marked_overdue} ${t('newly overdue')}, ${d.fines} ${t('fines')} (${inr(d.fine_total)}).`);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doWaive = async (fineId) => {
    const reason = window.prompt(t('Why is this fine being waived? It is recorded against your name.'));
    if (!reason?.trim()) return;
    try {
      await feeApi.waiveFine(fineId, reason.trim());
      flash(t('Fine waived.'));
      openCollect(ledger.student.id);
      load();
    } catch (e) { fail(e); }
  };

  const savePlan = async () => {
    setBusy(true);
    setErr('');
    try {
      if (planForm.id) await feeApi.updatePlan(planForm.id, planForm);
      else await feeApi.createPlan(planForm);
      flash(t('Fee plan saved.'));
      setPlanForm(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doAssign = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await feeApi.assignPlan({
        student_id: Number(assign.student_id),
        plan_id: Number(assign.plan_id),
        discount: Number(assign.discount || 0),
        start_date: assign.start_date || undefined,
      });
      flash(`${t('Schedule generated')}: ${r.data.data.installments.length} ${t('installments')}.`);
      setAssign(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const saveExpense = async () => {
    setBusy(true);
    setErr('');
    try {
      await feeApi.createExpense({ ...expForm, amount: Number(expForm.amount) });
      flash(t('Expense recorded.'));
      setExpForm(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const removeExpense = async (id) => {
    try { await feeApi.deleteExpense(id); flash(t('Expense deleted.')); load(); }
    catch (e) { fail(e); }
  };

  // Live preview of the plan being typed. This mirrors the server's formula for
  // feedback only — the figures that get STORED are always the server's.
  const preview = useMemo(() => {
    if (!planForm) return null;
    const taxable = Math.max(Number(planForm.base_fee || 0) + Number(planForm.registration_fee || 0), 0);
    const tax = (taxable * Number(planForm.tax_pct || 0)) / 100;
    const total = taxable + tax;
    const n = Math.max(1, Number(planForm.installments || 1));
    return { taxable, tax, total, each: total / n, n };
  }, [planForm]);

  const totalOverdue = dues.reduce((s, d) => s + Number(d.overdue_amount || 0) + Number(d.fines_due || 0), 0);

  return (
    <div className="space-y-4">
      <PageHero
        tone="amber"
        icon={Icons.fees}
        title="Fee Collection"
        subtitle="Dues, plans and expenses — every total is calculated by the server."
        action={can('fees.manage') && (
          <button onClick={doSweep} disabled={busy} className="erp-hero-btn px-4 py-2.5 min-h-11 disabled:opacity-50">
            {t('Run overdue check')}
          </button>
        )}
      />

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      <div className="erp-tabs">
        {visibleTabs.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={`erp-tab ${tab === x.key ? 'erp-tab-active' : ''}`}>
            {t(x.label)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-gray-500 py-8 text-center">{t('Loading…')}</p>}

      {!loading && ['dues', 'plans', 'expenses'].includes(tab) && (
        <div className="flex justify-end">
          {tab === 'dues' && <ExcelTools schema="feeDues" rows={dues} filename="fee-dues" />}
          {tab === 'plans' && <ExcelTools schema="feePlans" rows={plans} filename="fee-plans" />}
          {tab === 'expenses' && <ExcelTools schema="expenses" rows={expenses} filename="expenses" />}
        </div>
      )}

      {/* ---------------- DUES ---------------- */}
      {!loading && tab === 'dues' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="Students in arrears" value={dues.length} tone={dues.length ? 'rose' : 'emerald'} />
            <Stat label="Total overdue" value={inr(totalOverdue)} tone={totalOverdue ? 'rose' : 'emerald'} hint="Includes late fees" />
            <Stat label="Worst delay" value={dues.length ? `${dues[0].days_late} ${t('days')}` : '—'} tone="amber" />
          </div>

          {dues.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('Nobody is in arrears')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('Overdue installments appear here after the nightly check.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
                  <tr>
                    {['Student', 'Course', 'Overdue', 'Fines', 'Late by', ''].map((h) => (
                      <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {dues.map((d) => (
                    <tr key={d.student_id} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2">
                        <p className="font-bold text-gray-900 dark:text-slate-100">{d.name}</p>
                        <p className="text-[11px] text-gray-500">{d.admission_no || '—'} · {d.phone || '—'}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{d.course_title || '—'}</td>
                      <td className="px-3 py-2 font-bold text-rose-600">{inr(d.overdue_amount)}</td>
                      <td className="px-3 py-2 text-amber-600 font-semibold">{Number(d.fines_due) ? inr(d.fines_due) : '—'}</td>
                      <td className="px-3 py-2">
                        <span className="font-bold text-gray-700 dark:text-slate-300">{d.days_late}</span>
                        <span className="text-gray-400"> {t('days')}</span>
                        <p className="text-[10px] text-gray-400">{t('since')} {shortDate(d.oldest_due)}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => openCollect(d.student_id)}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white">
                          {t('Collect')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- PLANS ---------------- */}
      {!loading && tab === 'plans' && (
        <div className="space-y-3">
          {can('fees.structure') && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  loadLookups();
                  setPlanForm({
                    name: '', base_fee: '', registration_fee: 0, tax_pct: 18, installments: 1,
                    interval_days: 30, late_fee_per_day: 0, late_fee_cap: 0, grace_days: 0,
                  });
                }}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white">
                + {t('New fee plan')}
              </button>
              <button onClick={() => { loadLookups(); setAssign({ student_id: '', plan_id: '', discount: 0, start_date: '' }); }}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200">
                {t('Assign to a student')}
              </button>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('No fee plans yet')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('A plan defines what a course costs and how it splits into installments.')}</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className="p-4 rounded-xl erp-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.course_title || t('Any course')}</p>
                    </div>
                    <Pill s={p.status === 'active' ? 'paid' : 'pending'} />
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                    <p>{t('Base')} <b>{inr(p.base_fee)}</b> + {t('registration')} <b>{inr(p.registration_fee)}</b></p>
                    <p>{t('GST')} <b>{p.tax_pct}%</b> · <b>{p.installments}</b> {t('installments')}, {t('every')} {p.interval_days} {t('days')}</p>
                    {Number(p.late_fee_per_day) > 0 && (
                      <p className="text-amber-600">
                        {t('Late fee')} {inr(p.late_fee_per_day)}/{t('day')}
                        {Number(p.late_fee_cap) > 0 && ` (${t('max')} ${inr(p.late_fee_cap)})`}
                        {Number(p.grace_days) > 0 && ` · ${p.grace_days} ${t('grace days')}`}
                      </p>
                    )}
                    <p className="text-gray-400">{p.students_on_plan} {t('students on this plan')}</p>
                  </div>
                  {can('fees.structure') && (
                    <button onClick={() => { loadLookups(); setPlanForm({ ...p }); }}
                      className="mt-3 text-[11px] font-bold text-emerald-600">{t('Edit')}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- EXPENSES ---------------- */}
      {!loading && tab === 'expenses' && (
        <div className="space-y-3">
          {can('expenses.create') && (
            <button
              onClick={() => setExpForm({
                category: 'rent', payee: '', amount: '',
                spent_on: new Date().toISOString().slice(0, 10), mode: 'bank', note: '',
              })}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white">
              + {t('Record expense')}
            </button>
          )}

          {expenses.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('No expenses recorded')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('Rent, utilities, salaries, marketing — what the institute spends.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
                  <tr>
                    {['Voucher', 'Category', 'Paid to', 'Amount', 'Date', ''].map((h) => (
                      <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {expenses.map((e) => (
                    <tr key={e.id} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{e.voucher_no}</td>
                      <td className="px-3 py-2 font-semibold text-gray-700 dark:text-slate-300">{t(e.category)}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{e.payee || '—'}</td>
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-slate-100">{inr(e.amount)}</td>
                      <td className="px-3 py-2 text-gray-500">{shortDate(e.spent_on)}</td>
                      <td className="px-3 py-2 text-right">
                        {can('expenses.delete') && (
                          <button onClick={() => removeExpense(e.id)} className="text-[11px] font-bold text-rose-600">{t('Delete')}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- P&L ---------------- */}
      {!loading && tab === 'pnl' && pnl && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{shortDate(pnl.from)} — {shortDate(pnl.to)}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Collected" value={inr(pnl.collected)} tone="emerald" hint={`${pnl.payments} payments`} />
            <Stat label="Spent" value={inr(pnl.spent)} tone="rose" hint={`${pnl.vouchers} vouchers`} />
            <Stat label="Net" value={inr(pnl.net)} tone={pnl.net >= 0 ? 'emerald' : 'rose'} />
            <Stat label="Revenue leakage" value={inr(pnl.revenue_leakage)} tone="amber" hint="Billed, overdue, never collected" />
          </div>

          {pnl.by_category?.length > 0 && (
            <div className="p-4 rounded-xl erp-card">
              <p className="text-[11px] font-bold uppercase text-gray-500 mb-2">{t('Where the money went')}</p>
              {pnl.by_category.map((c) => {
                const pct = Number(pnl.spent) ? Math.round((Number(c.total) / Number(pnl.spent)) * 100) : 0;
                return (
                  <div key={c.category} className="mb-2">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-semibold text-gray-700 dark:text-slate-300">{t(c.category)}</span>
                      <span className="text-gray-500">{inr(c.total)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------- collect ---------------- */}
      {collect && ledger && (
        <Modal isOpen size="lg" title={`${t('Collect from')} ${ledger.student.name}`}
          onClose={() => { setCollect(null); setLedger(null); }}
          footer={<>
            <button onClick={() => { setCollect(null); setLedger(null); }}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={doCollect} disabled={busy || !(Number(collect.amount) > 0)}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : `${t('Collect')} ${collect.amount ? inr(collect.amount) : ''}`}
            </button>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                <p className="text-[10px] text-gray-500 uppercase font-bold">{t('Payable')}</p>
                <p className="font-extrabold text-sm">{inr(ledger.structure.payable)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                <p className="text-[10px] text-gray-500 uppercase font-bold">{t('Paid')}</p>
                <p className="font-extrabold text-sm text-emerald-600">{inr(ledger.structure.paid)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                <p className="text-[10px] text-gray-500 uppercase font-bold">{t('Due')}</p>
                <p className="font-extrabold text-sm text-rose-600">{inr(ledger.structure.due)}</p>
              </div>
            </div>

            {!ledger.structure.has_plan && (
              <p className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[11px] font-semibold text-amber-700">
                {t('This student has no fee plan yet — assign one before collecting.')}
              </p>
            )}

            {ledger.installments?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">{t('Schedule')}</p>
                <div className="space-y-1">
                  {ledger.installments.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                      <span className="font-mono text-gray-500">{i.invoice_no}</span>
                      <span className="text-gray-600 dark:text-slate-400">{t('due')} {shortDate(i.due_date)}</span>
                      <span className="font-semibold">{inr(i.paid_amount)} / {inr(i.amount)}</span>
                      <Pill s={i.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ledger.fines?.filter((f) => f.status === 'open').length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">{t('Late fees')}</p>
                {ledger.fines.filter((f) => f.status === 'open').map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20">
                    <span className="text-rose-700 dark:text-rose-400">{f.reason}</span>
                    <span className="font-bold text-rose-700">{inr(f.amount)}</span>
                    {can('fees.structure') && (
                      <button onClick={() => doWaive(f.id)} className="font-bold text-brand-600">{t('Waive')}</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" required hint="The server refuses more than is outstanding.">
                <input type="number" min="1" className={inputClsCompact} value={collect.amount}
                  onChange={(e) => setCollect({ ...collect, amount: e.target.value })} />
              </Field>
              <Field label="Mode">
                <select className={inputClsCompact} value={collect.mode}
                  onChange={(e) => setCollect({ ...collect, mode: e.target.value })}>
                  {['cash', 'card', 'upi', 'bank', 'cheque'].map((m) => <option key={m} value={m}>{t(m)}</option>)}
                </select>
              </Field>
              <Field label="Reference no" className="col-span-2">
                <input className={inputClsCompact} value={collect.reference_no}
                  onChange={(e) => setCollect({ ...collect, reference_no: e.target.value })}
                  placeholder={t('UPI / cheque / transaction id')} />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- plan ---------------- */}
      {planForm && (
        <Modal isOpen size="lg" title={planForm.id ? t('Edit fee plan') : t('New fee plan')} onClose={() => setPlanForm(null)}
          footer={<>
            <button onClick={() => setPlanForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={savePlan} disabled={busy || !planForm.name}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Save plan')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan name" required className="col-span-2">
              <input className={inputClsCompact} value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder={t('e.g. Full-Stack Diploma — 3 installments')} />
            </Field>
            <Field label="Course" hint="Leave empty to allow any course.">
              <select className={inputClsCompact} value={planForm.course_id || ''}
                onChange={(e) => setPlanForm({ ...planForm, course_id: e.target.value || null })}>
                <option value="">{t('Any course')}</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <Field label="Base fee (₹)" required>
              <input type="number" className={inputClsCompact} value={planForm.base_fee}
                onChange={(e) => setPlanForm({ ...planForm, base_fee: e.target.value })} />
            </Field>
            <Field label="Registration fee (₹)">
              <input type="number" className={inputClsCompact} value={planForm.registration_fee}
                onChange={(e) => setPlanForm({ ...planForm, registration_fee: e.target.value })} />
            </Field>
            <Field label="GST %">
              <input type="number" className={inputClsCompact} value={planForm.tax_pct}
                onChange={(e) => setPlanForm({ ...planForm, tax_pct: e.target.value })} />
            </Field>
            <Field label="Installments" hint="1 = pay in full.">
              <input type="number" min="1" max="36" className={inputClsCompact} value={planForm.installments}
                onChange={(e) => setPlanForm({ ...planForm, installments: e.target.value })} />
            </Field>
            <Field label="Days between installments">
              <input type="number" className={inputClsCompact} value={planForm.interval_days}
                onChange={(e) => setPlanForm({ ...planForm, interval_days: e.target.value })} />
            </Field>
            <Field label="Late fee per day (₹)" hint="0 = no late fee.">
              <input type="number" className={inputClsCompact} value={planForm.late_fee_per_day}
                onChange={(e) => setPlanForm({ ...planForm, late_fee_per_day: e.target.value })} />
            </Field>
            <Field label="Late fee cap (₹)" hint="0 = uncapped.">
              <input type="number" className={inputClsCompact} value={planForm.late_fee_cap}
                onChange={(e) => setPlanForm({ ...planForm, late_fee_cap: e.target.value })} />
            </Field>
            <Field label="Grace days" className="col-span-2" hint="Days after the due date before a fine starts.">
              <input type="number" className={inputClsCompact} value={planForm.grace_days}
                onChange={(e) => setPlanForm({ ...planForm, grace_days: e.target.value })} />
            </Field>

            {preview && (
              <div className="col-span-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-950/40 text-[11px] space-y-0.5">
                <div className="flex justify-between"><span>{t('Taxable')}</span><b>{inr(preview.taxable)}</b></div>
                <div className="flex justify-between"><span>{t('GST')}</span><b>{inr(preview.tax)}</b></div>
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-slate-700 pt-1 mt-1">
                  <span className="font-bold">{t('Total')}</span><b>{inr(preview.total)}</b>
                </div>
                <p className="text-gray-500 pt-1">
                  {preview.n} × {inr(preview.each)} — {t('the server rounds the last installment so the schedule sums exactly.')}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ---------------- assign ---------------- */}
      {assign && (
        <Modal isOpen size="md" title={t('Assign a fee plan')} onClose={() => setAssign(null)}
          footer={<>
            <button onClick={() => setAssign(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={doAssign} disabled={busy || !assign.student_id || !assign.plan_id}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Generate schedule')}
            </button>
          </>}>
          <div className="space-y-3">
            <Field label="Student" required>
              <select className={inputClsCompact} value={assign.student_id}
                onChange={(e) => setAssign({ ...assign, student_id: e.target.value })}>
                <option value="">{t('Select a student')}</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admission_no || s.id})</option>)}
              </select>
            </Field>
            <Field label="Fee plan" required>
              <select className={inputClsCompact} value={assign.plan_id}
                onChange={(e) => setAssign({ ...assign, plan_id: e.target.value })}>
                <option value="">{t('Select a plan')}</option>
                {plans.filter((p) => p.status === 'active').map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {inr(p.base_fee)}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount (₹)" hint="Scholarship, early bird…">
                <input type="number" className={inputClsCompact} value={assign.discount}
                  onChange={(e) => setAssign({ ...assign, discount: e.target.value })} />
              </Field>
              <Field label="First due date" hint="Defaults to today.">
                <input type="date" className={inputClsCompact} value={assign.start_date}
                  onChange={(e) => setAssign({ ...assign, start_date: e.target.value })} />
              </Field>
            </div>
            <p className="text-[11px] text-gray-500">
              {t('Reassigning is refused once the student has paid anything — adjust or waive the existing dues instead.')}
            </p>
          </div>
        </Modal>
      )}

      {/* ---------------- expense ---------------- */}
      {expForm && (
        <Modal isOpen size="md" title={t('Record an expense')} onClose={() => setExpForm(null)}
          footer={<>
            <button onClick={() => setExpForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={saveExpense} disabled={busy || !(Number(expForm.amount) > 0) || !expForm.spent_on}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Save expense')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" required>
              <select className={inputClsCompact} value={expForm.category}
                onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
                {['rent', 'utilities', 'salary', 'marketing', 'equipment', 'courseware', 'maintenance', 'other'].map((c) => (
                  <option key={c} value={c}>{t(c)}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (₹)" required>
              <input type="number" className={inputClsCompact} value={expForm.amount}
                onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            </Field>
            <Field label="Paid to">
              <input className={inputClsCompact} value={expForm.payee}
                onChange={(e) => setExpForm({ ...expForm, payee: e.target.value })} />
            </Field>
            <Field label="Date" required>
              <input type="date" className={inputClsCompact} value={expForm.spent_on}
                onChange={(e) => setExpForm({ ...expForm, spent_on: e.target.value })} />
            </Field>
            <Field label="Mode">
              <select className={inputClsCompact} value={expForm.mode}
                onChange={(e) => setExpForm({ ...expForm, mode: e.target.value })}>
                {['cash', 'card', 'upi', 'bank', 'cheque'].map((m) => <option key={m} value={m}>{t(m)}</option>)}
              </select>
            </Field>
            <Field label="Note">
              <input className={inputClsCompact} value={expForm.note}
                onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeesPage;
