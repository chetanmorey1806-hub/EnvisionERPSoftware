import React, { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { facultyPortalApi } from '../../api/facultyPortalApi';
// The full attendance client (register + session open/close), not the stub in
// facultyPortalApi which only had submitBulk.
import { attendanceApi } from '../../api/attendanceApi';

/* ------------------------------------------------------------------ helpers */
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (t) => (t ? t.slice(0, 5) : '--:--');
const prettyDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

const STATUS = {
  present: { label: 'Present', cls: 'bg-emerald-500 text-white', ring: 'ring-emerald-500' },
  absent: { label: 'Absent', cls: 'bg-rose-500 text-white', ring: 'ring-rose-500' },
  late: { label: 'Late', cls: 'bg-amber-500 text-white', ring: 'ring-amber-500' },
};
const TYPE_ICON = { material: '📄', assignment: '📝', lab: '🧪' };

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

const Tab = ({ active, onClick, children, badge }) => (
  <button
    onClick={onClick}
    className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
      active
        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
    }`}
  >
    {children}
    {badge != null && <span className="ml-1.5 opacity-70">({badge})</span>}
  </button>
);

/* --------------------------------------------------------------------- page */
const InstructorPortal = () => {
  const [date, setDate] = useState(todayISO());
  const [faculty, setFaculty] = useState(null);
  const [classes, setClasses] = useState([]);
  const [active, setActive] = useState(null);          // selected class
  const [tab, setTab] = useState('attendance');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  // attendance
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);   // the in-class check-in window

  // topics
  const [topics, setTopics] = useState('');
  const [duration, setDuration] = useState('');

  // materials
  const [materials, setMaterials] = useState([]);
  const [upload, setUpload] = useState({ title: '', type: 'material', due_date: '', file: null });

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  const loadSchedule = useCallback(() => {
    setLoading(true);
    facultyPortalApi.schedule(date)
      .then((r) => { setFaculty(r.data.data.faculty); setClasses(r.data.data.classes || []); })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load schedule.'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const openClass = async (cls) => {
    setActive(cls); setTab('attendance'); setError('');
    setTopics(cls.topics_covered || ''); setDuration('');
    try {
      const [r, m, reg] = await Promise.all([
        facultyPortalApi.roster(cls.batch_id, date),
        facultyPortalApi.materials(cls.batch_id),
        attendanceApi.getRegister(cls.batch_id, date).catch(() => null),
      ]);
      const students = r.data.data.students || [];
      setRoster(students);
      setMarks(Object.fromEntries(students.map((s) => [s.student_id, s.attendance_status || 'present'])));
      setMaterials(m.data.data || []);
      setSession(reg?.data?.data?.session || null);
    } catch (e) { setError(e.response?.data?.message || 'Unable to open class.'); }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      await attendanceApi.submitBulk({
        batchId: active.batch_id, date,
        records: roster.map((s) => ({ studentId: s.student_id, status: marks[s.student_id] })),
      });
      flash('Attendance saved.'); loadSchedule();
    } catch (e) { setError(e.response?.data?.message || 'Unable to save attendance.'); }
    finally { setSaving(false); }
  };

  // Open / close the in-class check-in window. While open, students can mark
  // themselves present by entering the code shown here.
  const refreshRegister = async () => {
    if (!active) return;
    const reg = await attendanceApi.getRegister(active.batch_id, date).catch(() => null);
    setSession(reg?.data?.data?.session || null);
    openClass(active);   // reload roster so self check-ins show up
  };
  const openCheckIn = async () => {
    try {
      const r = await attendanceApi.openSession(active.batch_id, date);
      setSession(r.data.data);
      flash(`Check-in open. Code: ${r.data.data.code}`);
    } catch (e) { setError(e.response?.data?.message || 'Unable to open check-in.'); }
  };
  const closeCheckIn = async () => {
    try {
      const r = await attendanceApi.closeSession(active.batch_id, date);
      flash(r.data.message);
      refreshRegister();
    } catch (e) { setError(e.response?.data?.message || 'Unable to close check-in.'); }
  };

  const saveTopics = async () => {
    if (!topics.trim()) return;
    setSaving(true);
    try {
      await facultyPortalApi.logTopics({
        batch_id: active.batch_id, date, topics_covered: topics,
        duration_min: duration ? Number(duration) : undefined,
      });
      flash('Daily topics logged.'); loadSchedule();
    } catch (e) { setError(e.response?.data?.message || 'Unable to log topics.'); }
    finally { setSaving(false); }
  };

  const saveMaterial = async () => {
    if (!upload.file || !upload.title) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('batch_id', active.batch_id);
      fd.append('title', upload.title);
      fd.append('type', upload.type);
      if (upload.due_date) fd.append('due_date', upload.due_date);
      fd.append('documents', upload.file);
      await facultyPortalApi.uploadMaterial(fd);
      const m = await facultyPortalApi.materials(active.batch_id);
      setMaterials(m.data.data || []);
      setUpload({ title: '', type: 'material', due_date: '', file: null });
      flash('File uploaded.');
    } catch (e) { setError(e.response?.data?.message || 'Unable to upload.'); }
    finally { setSaving(false); }
  };

  const presentCount = Object.values(marks).filter((s) => s === 'present').length;
  const setAll = (status) => setMarks(Object.fromEntries(roster.map((s) => [s.student_id, status])));

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <Breadcrumb items={[{ label: 'Faculty' }, { label: 'Instructor Portal' }]} />

      {/* Greeting + date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">
            {faculty ? `Welcome, ${faculty.name}` : 'Instructor Portal'}
          </h1>
          <p className="text-xs text-gray-500">{prettyDate(date)} · {classes.length} class{classes.length === 1 ? '' : 'es'} scheduled</p>
        </div>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setActive(null); }}
          className={`${inputCls} sm:w-44`} />
      </div>

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {notice}</div>}

      {/* ---------------- Today's schedule (timeline on mobile) ------------- */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Today&apos;s Schedule</h2>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
        ) : classes.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
            <div className="text-3xl mb-2">🌤️</div>
            <p className="text-sm text-gray-500">No classes scheduled for this day.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classes.map((c) => {
              const selected = active?.batch_id === c.batch_id;
              return (
                <button key={c.batch_id} onClick={() => openClass(c)}
                  className={`text-left p-4 rounded-xl border transition-all bg-white dark:bg-slate-900 hover:shadow-md ${
                    selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 dark:border-slate-800'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-800 dark:text-slate-100 truncate">{c.batch_name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.course_name} · {c.code}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 whitespace-nowrap">
                      {fmtTime(c.start_time)}–{fmtTime(c.end_time)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500">
                      👥 {c.student_count}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.attendance_marked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                      {c.attendance_marked ? '✓ Attendance' : '○ Attendance'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.topics_logged ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
                      {c.topics_logged ? '✓ Topics' : '○ Topics'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- Class workspace ---------------------------------- */}
      {active && (
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-gray-800 dark:text-slate-100">{active.batch_name}</h3>
              <p className="text-[11px] text-gray-400">{fmtTime(active.start_time)}–{fmtTime(active.end_time)} · {active.course_name}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <Tab active={tab === 'attendance'} onClick={() => setTab('attendance')} badge={roster.length}>Attendance</Tab>
              <Tab active={tab === 'topics'} onClick={() => setTab('topics')}>Topics</Tab>
              <Tab active={tab === 'materials'} onClick={() => setTab('materials')} badge={materials.length}>Materials</Tab>
            </div>
          </div>

          {/* ---- Attendance checklist ---- */}
          {tab === 'attendance' && (
            <div className="p-4 space-y-3">
              {/* In-class check-in: students self-mark present with this code */}
              <div className={`rounded-xl border p-3 ${
                session?.status === 'open'
                  ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900'
                  : 'border-gray-100 dark:border-slate-800'
              }`}>
                {session?.status === 'open' ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Check-in is open</p>
                      <p className="text-xs text-gray-500">Read this code out in class — students enter it to mark themselves present.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black tracking-[0.3em] text-blue-700 dark:text-blue-400 tabular-nums">
                        {session.code}
                      </span>
                      <button onClick={refreshRegister}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-blue-200 text-blue-700">
                        Refresh
                      </button>
                      <button onClick={closeCheckIn}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-600 text-white">
                        Close & finalise
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-gray-500">
                      {session?.status === 'closed'
                        ? 'Check-in was closed for today. You can still adjust the register below.'
                        : 'Let students mark their own presence: open check-in and show them the code.'}
                    </p>
                    <button onClick={openCheckIn}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-600 text-white">
                      {session?.status === 'closed' ? 'Reopen check-in' : 'Open check-in'}
                    </button>
                  </div>
                )}
              </div>

              {roster.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No students enrolled in this batch yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      <b className="text-emerald-600">{presentCount}</b> / {roster.length} present
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setAll('present')} className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 hover:bg-emerald-100">All present</button>
                      <button onClick={() => setAll('absent')} className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 hover:bg-rose-100">All absent</button>
                    </div>
                  </div>

                  <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                    {roster.map((s) => (
                      <li key={s.student_id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 grid place-items-center text-xs font-bold text-gray-500 shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{s.name}</p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">{s.student_uid || s.admission_no}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {Object.entries(STATUS).map(([key, v]) => (
                            <button key={key} onClick={() => setMarks({ ...marks, [s.student_id]: key })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                marks[s.student_id] === key ? v.cls : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200'
                              }`}>
                              {v.label.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button onClick={saveAttendance} disabled={saving}
                    className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Attendance'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ---- Daily topics ---- */}
          {tab === 'topics' && (
            <div className="p-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Topics covered today</span>
                <textarea rows={4} value={topics} onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. Arrays, time complexity, two-pointer technique…" className={`${inputCls} mt-1`} />
              </label>
              <label className="block sm:w-48">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Duration (minutes)</span>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="180" className={`${inputCls} mt-1`} />
              </label>
              <p className="text-[11px] text-gray-400">Saving again for the same day updates the existing log.</p>
              <button onClick={saveTopics} disabled={saving || !topics.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Log Topics'}
              </button>
            </div>
          )}

          {/* ---- Materials / assignments ---- */}
          {tab === 'materials' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40">
                <input placeholder="Title (e.g. Lab 1 — Arrays)" value={upload.title}
                  onChange={(e) => setUpload({ ...upload, title: e.target.value })} className={inputCls} />
                <select value={upload.type} onChange={(e) => setUpload({ ...upload, type: e.target.value })} className={inputCls}>
                  <option value="material">Course material</option>
                  <option value="assignment">Assignment</option>
                  <option value="lab">Lab assignment</option>
                </select>
                <input type="date" value={upload.due_date} onChange={(e) => setUpload({ ...upload, due_date: e.target.value })} className={inputCls} />
                <input type="file" onChange={(e) => setUpload({ ...upload, file: e.target.files[0] })}
                  className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" />
                <div className="sm:col-span-2">
                  <button onClick={saveMaterial} disabled={saving || !upload.file || !upload.title}
                    className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
                    {saving ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              </div>

              {materials.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No materials uploaded for this batch.</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                  {materials.map((m) => (
                    <li key={m.id} className="py-2.5 flex items-center gap-3">
                      <span className="text-lg">{TYPE_ICON[m.type]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{m.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {m.file_name} · {m.size_kb} KB{m.due_date ? ` · due ${m.due_date}` : ''}
                        </p>
                      </div>
                      <a href={m.file_url} target="_blank" rel="noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">Open</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default InstructorPortal;
