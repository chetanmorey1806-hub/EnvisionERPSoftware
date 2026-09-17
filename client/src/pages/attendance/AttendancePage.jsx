import React, { useEffect, useState } from 'react';
import { Icons } from '../../components/common/icons';
import { inputClsCompact } from '../../components/form/FormKit';
import { PageHeader, Empty, Flash, Table, Loading } from '../../components/common/PageKit';
import { attendanceApi } from '../../api/attendanceApi';
import { batchApi } from '../../api/batchApi';
import ExcelTools from '../../components/common/ExcelTools';
import { useT } from '../../context/LanguageContext';

const STATUS_TONE = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  absent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  leave: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
};

/**
 * Attendance — the OVERSIGHT view.
 *
 * Read-only, on purpose. Marking attendance belongs to the trainer who runs the
 * class (they do it under "My Classes"); this screen lets an admin, coordinator
 * or registrar SEE any batch's register without being able to change it. The
 * server enforces the same rule, so there are no mark buttons to hide.
 */
const AttendancePage = () => {
  const { t } = useT();
  const today = new Date().toISOString().slice(0, 10);

  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fail = (e) => setError(e?.response?.data?.message || e.message || t('Something went wrong.'));

  useEffect(() => {
    (async () => {
      try {
        const r = await batchApi.getAll();
        const list = r.data.data?.items || r.data.data || [];
        setBatches(list);
        if (list[0]) setBatchId(String(list[0].id));
      } catch (e) { fail(e); } finally { setLoading(false); }
    })();
  }, []);

  const load = async () => {
    if (!batchId) return;
    setBusy(true);
    setError('');
    try {
      const r = await attendanceApi.getRegister(batchId, date);
      setData(r.data.data);
    } catch (e) { fail(e); setData(null); } finally { setBusy(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [batchId, date]);

  const register = data?.register || [];

  return (
    <div className="space-y-4">
      <PageHeader tone="violet" icon={<Icons.attendance size={18} />} title="Attendance"
        subtitle="A read-only view of any batch's register. Marking is done by the batch's trainer under My Classes." />
      <Flash error={error} notice="" />

      {loading ? <Loading /> : batches.length === 0 ? (
        <Empty title="No batches yet" hint="Create a course and a batch first — attendance is always recorded against a batch." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inputClsCompact} max-w-xs`} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
            <input type="date" className={`${inputClsCompact} max-w-45`} value={date} onChange={(e) => setDate(e.target.value)} />
            <ExcelTools schema="attendance" rows={register}
              filename={`attendance-${batches.find((b) => String(b.id) === String(batchId))?.code || batchId}-${date}`} />
            {data && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-bold">
                  {data.present} {t('present')}
                </span>
                <span>{data.marked} {t('of')} {register.length} {t('marked')}</span>
                {data.session && (
                  <span className={`px-2 py-1 rounded-lg font-bold ${
                    data.session.status === 'open'
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}>
                    {t('Check-in')} {t(data.session.status)}
                  </span>
                )}
              </div>
            )}
          </div>

          {!data?.can_mark && (
            <p className="text-[11px] text-gray-400">
              {t('You are viewing this register. Only the batch’s trainer can mark it.')}
            </p>
          )}

          {busy && !data ? <Loading /> : register.length === 0 ? (
            <Empty title="Nobody is enrolled in this batch" hint="Enroll students into the batch and they will appear on the register." />
          ) : (
            <Table headers={['Student', 'Status', 'Marked by']}>
              {register.map((s) => (
                <tr key={s.student_id} className="bg-white dark:bg-slate-900">
                  <td className="px-3 py-2">
                    <p className="font-bold text-gray-900 dark:text-slate-100">{s.name}</p>
                    <p className="text-[11px] text-gray-500">{s.admission_no || '—'}</p>
                  </td>
                  <td className="px-3 py-2">
                    {s.status ? (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${STATUS_TONE[s.status]}`}>
                        {t(s.status)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">{t('not marked')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-500">
                    {s.source === 'self' ? t('self check-in') : s.source === 'trainer' ? t('trainer') : '—'}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
    </div>
  );
};

export default AttendancePage;
