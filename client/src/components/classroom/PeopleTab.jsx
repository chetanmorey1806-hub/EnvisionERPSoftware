import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../common/icons';
import { classApi } from '../../api/classApi';
import { Avatar, themeColor, useToast, errText } from './classKit';

/** People — the teacher and the students. Contact details are for teachers only. */
const PeopleTab = ({ cls, onCopyCode }) => {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    classApi.people(cls.id).then((r) => setData(r.data.data)).catch((e) => toast(errText(e, 'Could not load people.'), 'error'));
  }, [cls.id, toast]);
  useEffect(load, [load]);

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name} from this class?`)) return;
    try { const r = await classApi.removeStudent(cls.id, s.id); toast(r.data.message, 'success'); load(); }
    catch (e) { toast(errText(e, 'Could not remove the student.'), 'error'); }
  };

  if (!data) return <div className="erp-card h-40 animate-pulse" />;
  const tone = themeColor(cls.theme);
  const Heading = ({ children, right }) => (
    <div className="flex items-end justify-between border-b-2 pb-2 mb-2" style={{ borderColor: tone }}>
      <h2 className="text-2xl font-semibold" style={{ color: tone }}>{children}</h2>
      {right}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section>
        <Heading>Teachers</Heading>
        {data.teachers.length === 0 && <p className="text-[13px] text-gray-500 py-3">No trainer is assigned to this batch yet.</p>}
        {data.teachers.map((t) => (
          <div key={t.name} className="flex items-center gap-3 py-3">
            <Avatar name={t.name} size={36} tone={tone} />
            <span className="text-[14px] text-gray-800 dark:text-slate-100 flex-1">{t.name}</span>
            {t.email && (
              <a href={`mailto:${t.email}`} className="p-2 text-gray-400 hover:text-gray-700" title={`Email ${t.name}`} aria-label={`Email ${t.name}`}>
                <Icons.mail size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </section>

      <section>
        <Heading right={<span className="text-[13px] font-semibold" style={{ color: tone }}>{data.students.length} student{data.students.length === 1 ? '' : 's'}</span>}>
          Students
        </Heading>
        {data.can_teach && (
          <button type="button" onClick={onCopyCode}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 px-4 py-3 my-2 text-left hover:border-brand-400 transition">
            <span className="text-[13px] text-gray-600 dark:text-slate-300">Invite students: share the class code</span>
            <span className="font-mono font-bold tracking-widest" style={{ color: tone }}>{cls.class_code}</span>
          </button>
        )}
        {data.students.length === 0 && <p className="text-[13px] text-gray-500 py-3">No students yet.</p>}
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {data.students.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Avatar name={s.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-gray-800 dark:text-slate-100 truncate">{s.name}</span>
                {s.email && <span className="block text-[11px] text-gray-400 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ''}</span>}
              </span>
              {s.email && (
                <a href={`mailto:${s.email}`} className="p-2 text-gray-400 hover:text-gray-700" title={`Email ${s.name}`} aria-label={`Email ${s.name}`}>
                  <Icons.mail size={16} aria-hidden="true" />
                </a>
              )}
              {data.can_teach && (
                <button type="button" onClick={() => remove(s)} className="p-2 text-gray-400 hover:text-rose-600" title="Remove from class" aria-label={`Remove ${s.name}`}>
                  <Icons.close size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PeopleTab;
