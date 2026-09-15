import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import { PageHero } from '../../components/common/PageShell';
import ExcelTools from '../../components/common/ExcelTools';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { userApi } from '../../api/userApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * User Management — how every other person in this system comes to exist.
 *
 * Creating a "Trainer" here does two things at once: it creates the login AND
 * the trainer record their portal resolves them by. An account with only one
 * half can sign in and then be refused by every endpoint, which is a miserable
 * thing to debug — so the server does both, and this page reports which.
 *
 * Disabling sign-in is preferred over deleting: it locks the door while keeping
 * everything the person ever recorded (marks, receipts, attendance) attached to
 * a real name instead of orphaning it.
 */

const ROLE_TONE = {
  super_admin: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  admin: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  branch_head: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  coordinator: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  faculty: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  placement: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
  registrar: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  staff: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  student: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
};

const shortDate = (d) =>
  (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

const UsersPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const [form, setForm] = useState(null);       // create / edit
  const [perms, setPerms] = useState(null);     // permissions viewer
  const [pwd, setPwd] = useState(null);         // password reset

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 5000); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [u, r] = await Promise.all([userApi.getAll(), userApi.getRoles()]);
      setUsers(u.data.data || []);
      setRoles(r.data.data || []);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      if (form.id) {
        await userApi.update(form.id, {
          name: form.name, email: form.email, phone: form.phone, role: form.role, status: form.status,
        });
        flash(t('User updated.'));
      } else {
        const r = await userApi.create({
          name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone,
        });
        flash(r.data.message);
      }
      setForm(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const toggleLogin = async (u) => {
    try {
      const r = await userApi.setLoginEnabled(u.id, !u.login_enabled);
      flash(r.data.message);
      load();
    } catch (e) { fail(e); }
  };

  const resetPassword = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await userApi.setPassword(pwd.id, pwd.password);
      flash(`${r.data.message} (${pwd.name})`);
      setPwd(null);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const showPermissions = async (u) => {
    try {
      const r = await userApi.getPermissions(u.id);
      setPerms({ user: u, ...r.data.data });
    } catch (e) { fail(e); }
  };

  const remove = async (u) => {
    if (!window.confirm(t('Delete this account permanently? Disabling sign-in is usually the better option — it keeps their history intact.'))) return;
    try {
      const r = await userApi.delete(u.id);
      flash(r.data.message);
      load();
    } catch (e) { fail(e); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.name, u.email, u.phone, u.role_label].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, search, roleFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * perPage, current * perPage);

  return (
    <div className="space-y-4">
      <PageHero
        tone="slate"
        icon={Icons.users}
        title="User Management"
        subtitle="Create the accounts for trainers, the placement team, staff and students — and control who can sign in."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="users"
              rows={users}
              onCreate={can('users.create') ? userApi.create : undefined}
              onDone={load}
              variant="hero"
            />
            {can('users.create') && (
              <button
                onClick={() => setForm({ name: '', email: '', password: '', phone: '', role: 'faculty', status: 'active' })}
                className="erp-hero-btn px-4 py-2.5 min-h-11"
              >
                <Icons.plus size={15} aria-hidden="true" /> {t('Add user')}
              </button>
            )}
          </div>
        )}
      />

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      <div className="flex flex-wrap gap-2">
        <input className={`${inputClsCompact} max-w-xs`} value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('Search by name, email or phone…')} />
        <select className={`${inputClsCompact} max-w-45`} value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">{t('All roles')}</option>
          {roles.map((r) => <option key={r.id} value={r.name}>{r.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 py-10 text-center">{t('Loading…')}</p>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200">
            {users.length === 0 ? t('No users yet') : t('No user matches that search')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {users.length === 0
              ? t('Add your first trainer, placement officer or student. Creating a trainer also creates their trainer profile.')
              : t('Try a different name, email or role.')}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
                <tr>
                  {['User', 'Role', 'Contact', 'Sign-in', 'Last login', 'Actions'].map((h) => (
                    <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {shown.map((u) => (
                  <tr key={u.id} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-2">
                      <p className="font-bold text-gray-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-[11px] text-gray-500">{u.email}</p>
                      {(u.faculty_id || u.student_id) && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          ✓ {u.faculty_id ? t('trainer profile linked') : t('student profile linked')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ROLE_TONE[u.role] || ROLE_TONE.student}`}>
                        {u.role_label || u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{u.phone || '—'}</td>
                    <td className="px-3 py-2">
                      {can('users.update') ? (
                        <button onClick={() => toggleLogin(u)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            u.login_enabled
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700'
                              : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700'
                          }`}>
                          {u.login_enabled ? t('enabled') : t('disabled')}
                        </button>
                      ) : (
                        <span className="text-[11px]">{u.login_enabled ? t('enabled') : t('disabled')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{shortDate(u.last_login_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {can('users.update') && (
                          <button onClick={() => setForm({ ...u, password: '' })}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800">
                            {t('Edit')}
                          </button>
                        )}
                        <button onClick={() => showPermissions(u)}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800">
                          {t('Permissions')}
                        </button>
                        {can('users.update') && (
                          <button onClick={() => setPwd({ id: u.id, name: u.name, password: '' })}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800">
                            {t('Reset password')}
                          </button>
                        )}
                        {can('users.delete') && (
                          <button onClick={() => remove(u)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg text-rose-600">
                            {t('Delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <span>{t('Rows per page')}</span>
              <select className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>
                {(current - 1) * perPage + 1}–{Math.min(current * perPage, filtered.length)} {t('of')} {filtered.length}
              </span>
            </div>
            <div className="flex gap-1">
              <button disabled={current <= 1} onClick={() => setPage(current - 1)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 disabled:opacity-40 font-bold">
                {t('Prev')}
              </button>
              <button disabled={current >= pages} onClick={() => setPage(current + 1)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 disabled:opacity-40 font-bold">
                {t('Next')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---------------- create / edit ---------------- */}
      {form && (
        <Modal isOpen size="md" title={form.id ? t('Edit user') : t('Add user')} onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={save}
              disabled={busy || !form.name || !form.email || (!form.id && !form.password)}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-rose-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Save user')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" required className="col-span-2">
              <input className={inputClsCompact} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email" required hint="This is what they sign in with.">
              <input type="email" className={inputClsCompact} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputClsCompact} value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>

            <Field label="Role" required className="col-span-2"
              hint="A Trainer also gets a trainer profile; a Student also gets a student record.">
              <select className={inputClsCompact} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((r) => <option key={r.id} value={r.name}>{r.label}</option>)}
              </select>
            </Field>

            {roles.find((r) => r.name === form.role)?.description && (
              <p className="col-span-2 -mt-1 text-[11px] text-gray-500">
                {roles.find((r) => r.name === form.role).description}
              </p>
            )}

            {!form.id && (
              <Field label="Password" required className="col-span-2"
                hint="At least 6 characters. Give it to them directly — it is not emailed.">
                <input type="text" className={inputClsCompact} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
            )}

            {form.id && (
              <Field label="Status" className="col-span-2">
                <select className={inputClsCompact} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {['active', 'inactive', 'suspended'].map((s) => (
                    <option key={s} value={s}>{t(s)}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </Modal>
      )}

      {/* ---------------- permissions ---------------- */}
      {perms && (
        <Modal isOpen size="md" title={`${t('Permissions')} — ${perms.user.name}`} onClose={() => setPerms(null)}
          footer={
            <button onClick={() => setPerms(null)} className="px-4 py-2.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-800">
              {t('Close')}
            </button>
          }>
          <div className="space-y-3">
            <p className="text-[11px] text-gray-500">
              {t('These come from the role, not from the person. Change them by editing the role, and every account with that role changes with it.')}
            </p>
            <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
              {perms.user.role_label || perms.user.role} — {perms.total} {t('permissions')}
            </p>
            {perms.total === 0 ? (
              <p className="text-xs text-rose-600">{t('This account has no permissions and will see almost nothing.')}</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {Object.entries(perms.modules).map(([mod, actions]) => (
                  <div key={mod} className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 w-28 shrink-0">{mod}</span>
                    {actions.map((a) => (
                      <span key={a} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                        {a}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ---------------- password reset ---------------- */}
      {pwd && (
        <Modal isOpen size="sm" title={`${t('Reset password')} — ${pwd.name}`} onClose={() => setPwd(null)}
          footer={<>
            <button onClick={() => setPwd(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={resetPassword} disabled={busy || (pwd.password || '').length < 6}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-rose-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Reset password')}
            </button>
          </>}>
          <Field label="New password" required
            hint="At least 6 characters. It is not emailed — give it to them over a channel they trust.">
            <input type="text" className={inputClsCompact} value={pwd.password}
              onChange={(e) => setPwd({ ...pwd, password: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;
