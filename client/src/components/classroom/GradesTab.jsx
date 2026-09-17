import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../common/icons';
import { classApi } from '../../api/classApi';
import { exportToExcel } from '../../utils/excel';
import { StatusChip, fmtWhen, statusLabel, useToast, errText } from './classKit';

/**
 * Grades — every student × every graded piece of work.
 *
 * Cells are editable: typing a grade saves a DRAFT (the student does not see
 * it until the work is returned from the assignment page). Draft grades are
 * shown in violet so they are never mistaken for returned ones.
 */
const GradeCell = ({ cls, item, row, cell, onSaved }) => {
  const toast = useToast();
  const [value, setValue] = useState(cell.grade ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(cell.grade ?? ''); }, [cell.grade]);

  const save = async () => {
    const v = String(value).trim();
    if (v === String(cell.grade ?? '')) return;
    if (!v) { setValue(cell.grade ?? ''); return; }
    setSaving(true);
    try { await classApi.grade(cls.id, item.id, row.student_id, { grade: v }); onSaved(); }
    catch (e) { toast(errText(e, 'Could not save the grade.'), 'error'); setValue(cell.grade ?? ''); }
    finally { setSaving(false); }
  };

  const tone = cell.status === 'draft' ? 'text-violet-600 dark:text-violet-300'
    : cell.status === 'missing' ? 'text-rose-600' : 'text-gray-800 dark:text-slate-100';
  return (
    <td className="border-b border-r border-gray-100 dark:border-slate-800 px-2 py-1.5 align-middle min-w-[110px]">
      <div className="flex items-center gap-1">
        <input
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder={item.points ? '—' : '—'}
          aria-label={`Grade for ${row.name}, ${item.title}`}
          className={`w-14 bg-transparent text-[13px] font-semibold outline-none rounded px-1 py-0.5 focus:ring-2 focus:ring-brand-500/40 ${tone}`}
        />
        {item.points ? <span className="text-[11px] text-gray-400">/{item.points}</span> : null}
      </div>
      <span className={`block text-[10px] ${tone} opacity-80`}>
        {cell.status === 'draft' ? 'Draft' : cell.status === 'returned' ? '' : statusLabel(cell.status)}
      </span>
    </td>
  );
};

const GradesTab = ({ cls, refreshKey, onOpenItem }) => {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    classApi.grades(cls.id).then((r) => setData(r.data.data)).catch((e) => toast(errText(e, 'Could not load grades.'), 'error'));
  }, [cls.id, toast]);
  useEffect(load, [load, refreshKey]);

  const exportSheet = () => {
    const columns = [
      { key: 'name', label: 'Student' },
      { key: 'email', label: 'Email' },
      ...data.items.map((it) => ({
        key: `i${it.id}`,
        label: `${it.title}${it.points ? ` (/${it.points})` : ''}`.slice(0, 60),
        format: (r) => {
          const c = r.cells[it.id];
          if (c.grade !== null && c.grade !== undefined) return c.status === 'draft' ? `${c.grade} (draft)` : c.grade;
          return statusLabel(c.status);
        },
      })),
      { key: 'average', label: 'Overall %', format: (r) => (r.average ?? '') },
    ];
    exportToExcel({ filename: `grades-${cls.code || cls.id}`, sheetName: 'Grades', columns, rows: data.rows });
  };

  if (!data) return <div className="erp-card h-40 animate-pulse" />;
  if (!data.items.length) {
    return (
      <div className="erp-card p-10 text-center text-[13px] text-gray-500">
        Grades appear once you assign graded work (an assignment or a question) on the Classwork tab.
      </div>
    );
  }

  const avg = new Map(data.item_averages.map((a) => [a.id, a.average]));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-gray-500">
          Type a grade to save a <span className="text-violet-600 font-semibold">draft</span>. Open the assignment to return grades to students.
        </p>
        <button type="button" onClick={exportSheet} className="erp-btn erp-btn-outline text-xs px-3 py-2">
          <Icons.download size={14} aria-hidden="true" /> Export to Excel
        </button>
      </div>
      <div className="erp-card overflow-x-auto">
        <table className="border-collapse text-left w-max min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-900 border-b border-r border-gray-100 dark:border-slate-800 px-4 py-3 text-[12px] font-semibold text-gray-500 min-w-[200px]">
                Student
              </th>
              <th className="border-b border-r border-gray-100 dark:border-slate-800 px-3 py-3 text-[12px] font-semibold text-gray-500">Overall</th>
              {data.items.map((it) => (
                <th key={it.id} className="border-b border-r border-gray-100 dark:border-slate-800 px-2 py-2 align-bottom max-w-[140px]">
                  <span className="block text-[10px] text-gray-400">{it.due_at ? fmtWhen(it.due_at) : 'No due date'}</span>
                  <button type="button" onClick={() => onOpenItem(it.id)} className="block text-[12px] font-semibold text-brand-600 dark:text-brand-300 hover:underline text-left line-clamp-2">
                    {it.title}
                  </button>
                  <span className="block text-[10px] text-gray-400">{it.points ? `out of ${it.points}` : 'Ungraded'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-50/60 dark:bg-slate-800/30">
              <td className="sticky left-0 z-10 bg-gray-50 dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-800 px-4 py-2 text-[12px] font-semibold text-gray-600 dark:text-slate-300">Class average</td>
              <td className="border-b border-r border-gray-100 dark:border-slate-800" />
              {data.items.map((it) => (
                <td key={it.id} className="border-b border-r border-gray-100 dark:border-slate-800 px-3 py-2 text-[12px] text-gray-600 dark:text-slate-300">
                  {avg.get(it.id) ?? '—'}
                </td>
              ))}
            </tr>
            {data.rows.map((r) => (
              <tr key={r.student_id}>
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 border-b border-r border-gray-100 dark:border-slate-800 px-4 py-2">
                  <span className="block text-[13px] text-gray-800 dark:text-slate-100 truncate">{r.name}</span>
                </td>
                <td className="border-b border-r border-gray-100 dark:border-slate-800 px-3 py-2 text-[13px] font-semibold text-gray-700 dark:text-slate-200">
                  {r.average === null ? '—' : `${r.average}%`}
                </td>
                {data.items.map((it) => (
                  <GradeCell key={it.id} cls={cls} item={it} row={r} cell={r.cells[it.id]} onSaved={load} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length === 0 && <p className="text-[12px] text-gray-500">No students in this class yet.</p>}
      <p className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
        Legend: <StatusChip status="missing" /> <StatusChip status="turned_in" /> <StatusChip status="draft" /> <StatusChip status="returned" />
      </p>
    </div>
  );
};

export default GradesTab;
