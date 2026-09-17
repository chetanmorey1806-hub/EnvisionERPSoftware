import React from 'react';
import { Icons } from '../../components/common/icons';
import { PageHeader, Empty, Flash, Table, Pill, useList, Loading, dateStr } from '../../components/common/PageKit';
import { followupApi } from '../../api/followupApi';
import ExcelTools from '../../components/common/ExcelTools';

/** Follow-ups that are due. Created against an enquiry, from the Enquiries page. */
const FollowupPage = () => {
  const L = useList(followupApi.getPendingLogs);

  return (
    <div className="space-y-4">
      <PageHeader tone="amber" icon={<Icons.followups size={18} />} title="Follow-ups"
        subtitle="Callbacks that are due. Every one belongs to an enquiry — raise them from the Enquiries page."
        action={<ExcelTools schema="followups" rows={L.items} variant="hero" />} />
      <Flash error={L.error} notice={L.notice} />

      {L.loading ? <Loading /> : L.items.length === 0 ? (
        <Empty title="Nothing to follow up" hint="When you log a follow-up against an enquiry, it appears here on its due date." />
      ) : (
        <Table headers={['Enquiry', 'Note', 'Due', 'Next', 'Status']}>
          {L.items.map((f) => (
            <tr key={f.id} className="bg-white dark:bg-slate-900">
              <td className="px-3 py-2">
                <p className="font-bold text-gray-900 dark:text-slate-100">{f.enquiry_name || `#${f.enquiry_id}`}</p>
                <p className="text-[11px] text-gray-500">{f.phone || ''}</p>
              </td>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{f.note || '—'}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{dateStr(f.followup_date)}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{dateStr(f.next_followup_date)}</td>
              <td className="px-3 py-2"><Pill s={f.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
};

export default FollowupPage;
