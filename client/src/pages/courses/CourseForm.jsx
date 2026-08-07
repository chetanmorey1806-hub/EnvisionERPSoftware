import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../../components/common/icons';
import { Field, Section, FormHeader, FormError, FormSkeleton, DayPicker, inputCls } from '../../components/form/FormKit';
import { useT } from '../../context/LanguageContext';
import { courseApi, roomApi } from '../../api/courseApi';
import { facultyApi } from '../../api/facultyApi';

/**
 * Course — New / Edit.
 *
 * New: optionally schedules the first batch in the same submit (POST
 * /courses/full), which the server writes in one transaction. The conflict
 * engine runs BEFORE any insert, so a clashing schedule leaves no orphan
 * course behind — the whole submit is rejected and the reason comes back here.
 *
 * Edit: course fields only. Timings live on the batch, so they are changed
 * from the batch form.
 */
const EMPTY = {
  code: '', title: '', department: '', duration: '', credits: '', fee: '', description: '',
};

const EMPTY_BATCH = {
  code: '', name: '', faculty_id: '', classroom_id: '',
  start_date: '', end_date: '', start_time: '', end_time: '',
  days_of_week: [], capacity: '',
};

const CourseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);

  const [course, setCourse] = useState(EMPTY);
  const [batch, setBatch] = useState(EMPTY_BATCH);
  const [schedule, setSchedule] = useState(!isEdit);
  const [trainers, setTrainers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setC = (k, v) => setCourse((f) => ({ ...f, [k]: v }));
  const setB = (k, v) => setBatch((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    facultyApi.getAll().then((r) => setTrainers(r.data.data || [])).catch(() => {});
    roomApi.getAll().then((r) => setRooms(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    courseApi.getById(id)
      .then((r) => {
        const c = r.data.data || {};
        setCourse({ ...EMPTY, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ''])) });
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load the course.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const coursePayload = { ...course };
      ['credits', 'fee'].forEach((k) => {
        if (coursePayload[k] === '') delete coursePayload[k];
        else coursePayload[k] = Number(coursePayload[k]);
      });

      if (isEdit) {
        await courseApi.update(id, coursePayload);
      } else if (schedule) {
        const batchPayload = { ...batch };
        ['faculty_id', 'classroom_id', 'capacity'].forEach((k) => {
          if (batchPayload[k] === '') delete batchPayload[k];
          else batchPayload[k] = Number(batchPayload[k]);
        });
        Object.keys(batchPayload).forEach((k) => {
          if (batchPayload[k] === '') delete batchPayload[k];
        });
        await courseApi.createFull({ course: coursePayload, batch: batchPayload });
      } else {
        await courseApi.create(coursePayload);
      }
      navigate('/courses', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the course.');
    } finally { setSaving(false); }
  };

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={save} className="space-y-5">
      <FormHeader
        title={isEdit ? 'Edit Course' : 'New Course'}
        subtitle={isEdit
          ? 'Update the course. Timings live on its batches.'
          : 'Create the course, and optionally schedule its first batch in the same step.'}
        onCancel={() => navigate('/courses')}
        saving={saving}
        disabled={!course.code || !course.title}
        saveLabel={isEdit ? 'Update course' : schedule ? 'Create course & schedule' : 'Create course'}
      />

      <FormError error={error} />

      <Section icon={Icons.courses} title="Course details">
        <Field label="Course code" required hint="Short unique code, e.g. PY-101">
          <input className={inputCls} value={course.code} onChange={(e) => setC('code', e.target.value)} placeholder="PY-101" />
        </Field>
        <Field label="Course name" required>
          <input className={inputCls} value={course.title} onChange={(e) => setC('title', e.target.value)} placeholder="Python Full Stack" />
        </Field>
        <Field label="Department">
          <input className={inputCls} value={course.department} onChange={(e) => setC('department', e.target.value)} placeholder="Software Development" />
        </Field>
        <Field label="Duration" hint="e.g. 3 months, 120 hours">
          <input className={inputCls} value={course.duration} onChange={(e) => setC('duration', e.target.value)} placeholder="3 months" />
        </Field>
        <Field label="Credits">
          <input type="number" min="0" className={inputCls} value={course.credits} onChange={(e) => setC('credits', e.target.value)} />
        </Field>
        <Field label="Course fee (₹)">
          <input type="number" min="0" className={inputCls} value={course.fee} onChange={(e) => setC('fee', e.target.value)} placeholder="25000" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" hint="What the student will be able to do at the end.">
            <textarea rows={3} className={inputCls} value={course.description} onChange={(e) => setC('description', e.target.value)} />
          </Field>
        </div>
      </Section>

      {!isEdit && (
        <>
          <label className="flex items-center gap-2.5 p-4 rounded-xl erp-card cursor-pointer">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600" />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              {t('Schedule the first batch now')}
            </span>
            <span className="text-[11px] text-gray-400">
              {t('Leave unticked to create the course only — you can add batches later.')}
            </span>
          </label>

          {schedule && (
            <Section icon={Icons.batches} title="First batch — timings, trainer & room">
              <Field label="Batch code" required hint="e.g. PY-101-B1">
                <input className={inputCls} value={batch.code} onChange={(e) => setB('code', e.target.value)} placeholder="PY-101-B1" />
              </Field>
              <Field label="Batch name" required>
                <input className={inputCls} value={batch.name} onChange={(e) => setB('name', e.target.value)} placeholder="Morning Batch" />
              </Field>
              <Field label="Start date" required>
                <input type="date" className={inputCls} value={batch.start_date} onChange={(e) => setB('start_date', e.target.value)} />
              </Field>
              <Field label="End date">
                <input type="date" className={inputCls} value={batch.end_date} onChange={(e) => setB('end_date', e.target.value)} />
              </Field>
              <Field label="Start time" required hint="Must fall inside the institute's operating hours.">
                <input type="time" className={inputCls} value={batch.start_time} onChange={(e) => setB('start_time', e.target.value)} />
              </Field>
              <Field label="End time" required>
                <input type="time" className={inputCls} value={batch.end_time} onChange={(e) => setB('end_time', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Class days" hint="A batch with no days set is treated as running every day, and will clash with everything.">
                  <DayPicker value={batch.days_of_week} onChange={(v) => setB('days_of_week', v)} />
                </Field>
              </div>
              <Field label="Trainer" hint="A trainer already teaching at this time will be rejected.">
                <select className={inputCls} value={batch.faculty_id} onChange={(e) => setB('faculty_id', e.target.value)}>
                  <option value="">{t('Select trainer…')}</option>
                  {trainers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
              <Field label="Classroom / lab" hint="Seats cannot exceed the room's capacity.">
                <select className={inputCls} value={batch.classroom_id} onChange={(e) => setB('classroom_id', e.target.value)}>
                  <option value="">{t('Select room…')}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.capacity} {t('seats')})</option>
                  ))}
                </select>
              </Field>
              <Field label="Seats">
                <input type="number" min="1" className={inputCls} value={batch.capacity} onChange={(e) => setB('capacity', e.target.value)} placeholder="20" />
              </Field>
            </Section>
          )}
        </>
      )}
    </form>
  );
};

export default CourseForm;
