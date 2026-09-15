import React, { useState } from 'react';
import ExcelTools from '../../components/common/ExcelTools';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { PageHeader, Empty, Flash, Table, Pill, Btn, useList, Loading } from '../../components/common/PageKit';
import { staffApi } from '../../api/staffApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Non-teaching staff: front desk, accounts, admin. */
const StaffPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const L = useList(staffApi.getAll);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await staffApi.update(form.id, form);
      else await staffApi.create(form);
      L.flash(t('Staff member saved.'));
      setForm(null);
      L.load();
    } catch (e) { L.fail(e); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader tone="brand" icon={<Icons.staff size={18} />} title="Staff"
        subtitle="Front desk, accounts and administration — the people who are not trainers."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="staff"
              rows={L.items}
              onCreate={can('staff.create') ? staffApi.create : undefined}
              onDone={L.load}
              variant="hero"
            />
            {can('staff.create') && (
              <button
                onClick={() => setForm({ name: '', email: '', phone: '', department: '', designation: '', status: 'active' })}
                className="erp-hero-btn px-4 py-2.5 min-h-11"
              >
                <Icons.plus size={15} aria-hidden="true" /> {t('Add staff')}
              </button>
            )}
          </div>
        )} />
      <Flash error={L.error} notice={L.notice} />

      {L.loading ? <Loading /> : L.items.length === 0 ? (
        <Empty title="No staff yet" hint="Add your first staff member. To give them a login as well, create their account in User Management." />
      ) : (
        <Table headers={['Name', 'Designation', 'Department', 'Contact', 'Status', '']}>
          {L.items.map((s) => (
            <tr key={s.id} className="bg-white dark:bg-slate-900">
              <td className="px-3 py-2">
                <p className="font-bold text-gray-900 dark:text-slate-100">{s.name}</p>
                <p className="text-[11px] text-gray-500">{s.employee_no || '—'}</p>
              </td>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{s.designation || '—'}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{s.department || '—'}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">
                <p>{s.email || '—'}</p>
                <p className="text-[11px]">{s.phone || '—'}</p>
              </td>
              <td className="px-3 py-2"><Pill s={s.status} /></td>
              <td className="px-3 py-2 text-right">
                {can('staff.update') && <Btn onClick={() => setForm({ ...s })}>{t('Edit')}</Btn>}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {form && (
        <Modal isOpen size="md" title={form.id ? t('Edit staff') : t('Add staff')} onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={save} disabled={busy || !form.name}
              className="erp-btn-primary px-4 py-2.5 text-xs">
              {busy ? t('Saving…') : t('Save')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" required className="col-span-2">
              <input className={inputClsCompact} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Designation"><input className={inputClsCompact} value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Department"><input className={inputClsCompact} value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className={inputClsCompact} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClsCompact} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffPage;
