import React from 'react';
import { Icons } from '../../components/common/icons';
import { PageHeader, Empty, Flash, Table, Pill, Btn, useList, Loading, dateStr } from '../../components/common/PageKit';
import { admissionApi } from '../../api/admissionApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Admission applications waiting on a decision. */
const AdmissionsPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const L = useList(() => admissionApi.getApplications());

  const decide = async (row, status) => {
    try {
      await admissionApi.updateStatus(row.id, { status });
      L.flash(`${t('Application')} ${t(status)}.`);
      L.load();
    } catch (e) { L.fail(e); }
  };

  return (
    <div className="space-y-4">
      <PageHeader tone="amber" icon={<Icons.admissions size={18} />} title="Admissions"
        subtitle="Applications waiting on a decision. Approving one creates the student record." />
      <Flash error={L.error} notice={L.notice} />

      {L.loading ? <Loading /> : L.items.length === 0 ? (
        <Empty title="No applications yet" hint="Applications arrive here from the admission form, or when a counselor converts an enquiry." />
      ) : (
        <Table headers={['Applicant', 'Course', 'Applied', 'Documents', 'Status', 'Actions']}>
          {L.items.map((a) => (
            <tr key={a.id} className="bg-white dark:bg-slate-900">
              <td className="px-3 py-2">
                <p className="font-bold text-gray-900 dark:text-slate-100">{a.name}</p>
                <p className="text-[11px] text-gray-500">{a.email || '—'} · {a.phone || '—'}</p>
              </td>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{a.course_title || '—'}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{dateStr(a.applied_at)}</td>
              <td className="px-3 py-2">
                <span className={a.docs_verified ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                  {a.docs_verified ? `✓ ${t('verified')}` : t('not verified')}
                </span>
              </td>
              <td className="px-3 py-2"><Pill s={a.status} /></td>
              <td className="px-3 py-2">
                {can('admissions.update') && a.status !== 'approved' && a.status !== 'rejected' && (
                  <div className="flex gap-1.5">
                    <Btn tone="green" onClick={() => decide(a, 'approved')}>{t('Approve')}</Btn>
                    <Btn tone="rose" onClick={() => decide(a, 'rejected')}>{t('Reject')}</Btn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
};

export default AdmissionsPage;
