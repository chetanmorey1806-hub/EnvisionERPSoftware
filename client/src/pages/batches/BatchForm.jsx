import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { Icons } from '../../components/common/icons';
import { Field, Section, FormHeader, FormError, FormSkeleton, DayPicker, inputCls } from '../../components/form/FormKit';
import { useT } from '../../context/LanguageContext';
import { batchApi } from '../../api/batchApi';
import { courseApi, roomApi } from '../../api/courseApi';
import { facultyApi } from '../../api/facultyApi';

/**
 * Batch — New / Edit.
 *
 * Every save goes through the conflict engine on the server: trainer
 * double-booking, the trainer's daily batch limit, room double-booking, room
 * capacity, and the institute's operating hours. A rejection comes back as a
 * 409 and is shown verbatim in the error band rather than being swallowed.
 */
const EMPTY = {
  code: '', name: '', course_id: '', faculty_id: '', classroom_id: '',
  start_date: '', end_date: '', start_time: '', end_time: '',
  days_of_week: [], capacity: '', status: 'upcoming',
};

const BatchForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    courseApi.getAll().then((r) => setCourses(r.data.data || [])).catch(() => {});
    facultyApi.getAll().then((r) => setTrainers(r.data.data || [])).catch(() => {});
    roomApi.getAll().then((r) => setRooms(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    batchApi.getById(id)
      .then((r) => {
        const b = r.data.data || {};
        // days_of_week comes back as a JSON column — it may already be an array.
        let days = b.days_of_week;
        if (typeof days === 'string') { try { days = JSON.parse(days); } catch { days = []; } }
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v ?? ''])),
          days_of_week: Array.isArray(days) ? days : [],
        });
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load the batch.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form, id: isEdit ? Number(id) : undefined };
      ['course_id', 'faculty_id', 'classroom_id', 'capacity'].forEach((k) => {
        if (payload[k] === '' || payload[k] == null) delete payload[k];
        else payload[k] = Number(payload[k]);
      });
      ['start_date', 'end_date', 'start_time', 'end_time'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      if (!isEdit) delete payload.id;

      if (isEdit) await batchApi.update(id, payload);
      else await batchApi.create(payload);
      navigate('/batches', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the batch.');
    } finally { setSaving(false); }
  };

  const room = rooms.find((r) => String(r.id) === String(form.classroom_id));
  const overCapacity = room && form.capacity && Number(form.capacity) > Number(room.capacity);

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={save} className="space-y-5">
      <Breadcrumb items={[{ label: t('Master') }, { label: t('Batches'), path: '/batches' }, { label: isEdit ? t('Edit') : t('New') }]} />

      <FormHeader
        title={isEdit ? 'Edit Batch' : 'New Batch'}
        subtitle="Timings, trainer and room are checked for clashes before the batch is saved."
        onCancel={() => navigate('/batches')}
        saving={saving}
        disabled={!form.code || !form.name || !form.course_id}
        saveLabel={isEdit ? 'Update batch' : 'Create batch'}
      />

      <FormError error={error} />

      <Section icon={Icons.batches} title="Batch details">
        <Field label="Batch code" required hint="Short unique code, e.g. PY-101-B1">
          <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="PY-101-B1" />
        </Field>
        <Field label="Batch name" required>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Morning Batch" />
        </Field>
        <Field label="Course" required>
          <select className={inputCls} value={form.course_id} onChange={(e) => set('course_id', e.target.value)}>
            <option value="">{t('Select course…')}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['upcoming', 'ongoing', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </Field>
      </Section>

      <Section icon={Icons.clock} title="Schedule">
        <Field label="Start date" required>
          <input type="date" className={inputCls} value={form.start_date?.slice?.(0, 10) || ''}
            onChange={(e) => set('start_date', e.target.value)} />
        </Field>
        <Field label="End date">
          <input type="date" className={inputCls} value={form.end_date?.slice?.(0, 10) || ''}
            onChange={(e) => set('end_date', e.target.value)} />
        </Field>
        <Field label="Start time" required hint="Must fall inside the institute's operating hours.">
          <input type="time" className={inputCls} value={form.start_time?.slice?.(0, 5) || ''}
            onChange={(e) => set('start_time', e.target.value)} />
        </Field>
        <Field label="End time" required>
          <input type="time" className={inputCls} value={form.end_time?.slice?.(0, 5) || ''}
            onChange={(e) => set('end_time', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Class days" hint="A batch with no days set is treated as running every day, and will clash with everything.">
            <DayPicker value={form.days_of_week} onChange={(v) => set('days_of_week', v)} />
          </Field>
        </div>
      </Section>

      <Section icon={Icons.team} title="Trainer & room">
        <Field label="Trainer" hint="A trainer already teaching at this time will be rejected.">
          <select className={inputCls} value={form.faculty_id} onChange={(e) => set('faculty_id', e.target.value)}>
            <option value="">{t('Select trainer…')}</option>
            {trainers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Classroom / lab">
          <select className={inputCls} value={form.classroom_id} onChange={(e) => set('classroom_id', e.target.value)}>
            <option value="">{t('Select room…')}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.capacity} {t('seats')})</option>
            ))}
          </select>
        </Field>
        <Field label="Seats" hint={room ? `${t('This room seats')} ${room.capacity}.` : 'Seats cannot exceed the room\'s capacity.'}>
          <input type="number" min="1" className={inputCls} value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)} placeholder="20" />
          {overCapacity && (
            <span className="mt-1 block text-[10px] font-bold text-rose-600">
              {t('More seats than the room holds — the server will reject this.')}
            </span>
          )}
        </Field>
      </Section>
    </form>
  );
};

export default BatchForm;
