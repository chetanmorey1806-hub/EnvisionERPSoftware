import React, { useEffect, useState } from 'react';
import { Icons } from '../../components/common/icons';
import { inputClsCompact } from '../../components/form/FormKit';
import { PageHeader, Empty, Flash, Table, Loading } from '../../components/common/PageKit';
import { resultApi } from '../../api/resultApi';
import { examApi } from '../../api/examApi';
import { batchApi } from '../../api/batchApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Marks for one exam in one batch. Enter them here; the grade is computed. */
const ResultsPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const [batches, setBatches] = useState([]);
  const [exams, setExams] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fail = (e) => setError(e?.response?.data?.message || e.message || t('Something went wrong.'));
  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };

  useEffect(() => {
    (async () => {
      try {
        const [b, e] = await Promise.all([batchApi.getAll(), examApi.getAll()]);
        const bl = b.data.data?.items || b.data.data || [];
        const el = e.data.data?.items || e.data.data || [];
        setBatches(bl);
        setExams(el);
        if (bl[0]) setBatchId(String(bl[0].id));
        if (el[0]) setExamId(String(el[0].id));
      } catch (e2) { fail(e2); } finally { setLoading(false); }
    })();
  }, []);

  const load = async () => {
    if (!batchId || !examId) return;
    setBusy(true);
    setError('');
    try {
      const r = await resultApi.getBatchResults(batchId, examId);
      const list = r.data.data || [];
      setRows(list);
      setMarks(Object.fromEntries(list.map((s) => [s.student_id ?? s.id, s.marks_obtained ?? ''])));
    } catch (e) { fail(e); setRows([]); } finally { setBusy(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [batchId, examId]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = Object.entries(marks)
        .filter(([, v]) => v !== '' && v !== null)
        .map(([studentId, m]) => ({ student_id: Number(studentId), marks_obtained: Number(m) }));
      const r = await resultApi.uploadMarks({ exam_id: Number(examId), marks: payload });
      flash(r.data.message || t('Marks saved.'));
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const exam = exams.find((e) => String(e.id) === String(examId));

  return (
    <div className="space-y-4">
      <PageHeader tone="violet" icon={<Icons.results size={18} />} title="Results"
        subtitle="Enter marks for an exam. The grade and pass/fail follow from the exam's own total and passing mark." />
      <Flash error={error} notice={notice} />

      {loading ? <Loading /> : exams.length === 0 ? (
        <Empty title="No exams yet" hint="Schedule an exam under Examinations first — marks are always recorded against one." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <select className={`${inputClsCompact} max-w-xs`} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className={`${inputClsCompact} max-w-xs`} value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            {can('results.create') && rows.length > 0 && (
              <button onClick={save} disabled={busy}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
                {busy ? t('Saving…') : t('Save marks')}
              </button>
            )}
          </div>

          {exam && (
            <p className="text-[11px] text-gray-500">
              {t('Out of')} {exam.total_marks} · {t('pass mark')} {exam.passing_marks}
            </p>
          )}

          {busy && rows.length === 0 ? <Loading /> : rows.length === 0 ? (
            <Empty title="No students to mark" hint="Nobody is enrolled in this batch yet." />
          ) : (
            <Table headers={['Student', 'Marks', 'Grade', 'Result']}>
              {rows.map((s) => {
                const id = s.student_id ?? s.id;
                const v = marks[id];
                const pct = exam && v !== '' ? (Number(v) / Number(exam.total_marks)) * 100 : null;
                const passed = exam && v !== '' ? Number(v) >= Number(exam.passing_marks) : null;
                return (
                  <tr key={id} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-2">
                      <p className="font-bold text-gray-900 dark:text-slate-100">{s.name}</p>
                      <p className="text-[11px] text-gray-500">{s.admission_no || '—'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" max={exam?.total_marks}
                        disabled={!can('results.create')}
                        className={`${inputClsCompact} max-w-24`} value={v ?? ''}
                        onChange={(e) => setMarks({ ...marks, [id]: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-400">
                      {pct === null ? '—' : `${Math.round(pct)}%`}
                    </td>
                    <td className="px-3 py-2">
                      {passed === null ? <span className="text-gray-400">—</span>
                        : <span className={`text-[11px] font-bold uppercase ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {passed ? t('pass') : t('fail')}
                          </span>}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsPage;
