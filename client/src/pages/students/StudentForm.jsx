import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../../components/common/icons';
import { Field, Section, FormHeader, FormError, FormSkeleton, inputClsCompact } from '../../components/form/FormKit';
import { studentApi } from '../../api/studentApi';
import { courseApi } from '../../api/courseApi';
import { batchApi } from '../../api/batchApi';
import { useT } from '../../context/LanguageContext';

/**
 * Student — New / Edit.
 *
 * Same List → New → Edit route flow as the reference project, but every input
 * is institute-domain: admission details, course & batch allocation, guardian
 * contact and prior education — not manufacturing fields.
 */
const EMPTY = {
  name: '', email: '', phone: '', dob: '', gender: '',
  address: '', course_id: '', batch_id: '',
  guardian_name: '', guardian_phone: '',
  qualification: '', admission_date: '', status: 'active',
};

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    courseApi.getAll().then((r) => setCourses(r.data.data || [])).catch(() => {});
    batchApi.getAll().then((r) => setBatches(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    studentApi.getById(id)
      .then((r) => {
        const s = r.data.data || {};
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? ''])) });
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load the student.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      // Empty strings are not valid ids/dates — drop them.
      ['course_id', 'batch_id'].forEach((k) => {
        if (payload[k]) payload[k] = Number(payload[k]); else delete payload[k];
      });
      ['dob', 'admission_date', 'gender'].forEach((k) => { if (!payload[k]) delete payload[k]; });

      if (isEdit) await studentApi.update(id, payload);
      else await studentApi.create(payload);
      navigate('/students', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the student.');
    } finally { setSaving(false); }
  };

  // Only show batches that belong to the chosen course.
  const batchOptions = form.course_id
    ? batches.filter((b) => String(b.course_id) === String(form.course_id))
    : batches;

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={save} className="space-y-3">
      {/* Header sticks, so Save/Cancel stay reachable without scrolling back up. */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 space-y-2
                      bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur
                      border-b border-gray-100 dark:border-slate-800">
        <FormHeader
          title={isEdit ? 'Edit Student' : 'New Student Admission'}
          subtitle={isEdit
            ? 'Update the student record.'
            : 'Register a student and allocate them to a course and batch.'}
          onCancel={() => navigate('/students')}
          saving={saving}
          disabled={!form.name}
          saveLabel={isEdit ? 'Update student' : 'Admit student'}
        />
      </div>

      <FormError error={error} />

      {/*
        All 13 fields on one screen: the three cards sit side by side rather than
        stacked, so nothing falls below the fold on a laptop. They stack again
        below xl, where scrolling is expected anyway.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-3 items-start">
        <Section icon={Icons.students} title="Student details" dense cols={2}
          className="lg:col-span-2 xl:col-span-6">
          <Field label="Full name" required>
            <input className={inputClsCompact} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Anita Verma" />
          </Field>
          <Field label="Mobile number">
            <input className={inputClsCompact} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9876543210" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClsCompact} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="student@example.com" />
          </Field>
          <Field label="Date of birth">
            <input type="date" className={inputClsCompact} value={form.dob?.slice?.(0, 10) || ''} onChange={(e) => set('dob', e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className={inputClsCompact} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">{t('Select…')}</option>
              <option value="male">{t('Male')}</option>
              <option value="female">{t('Female')}</option>
              <option value="other">{t('Other')}</option>
            </select>
          </Field>
          <Field label="Highest qualification" hint="e.g. B.Sc Computer Science">
            <input className={inputClsCompact} value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="B.Sc Computer Science" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea rows={2} className={inputClsCompact} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section icon={Icons.courses} title="Course & batch allocation" dense cols={1}
          className="xl:col-span-3">
          <Field label="Course">
            <select className={inputClsCompact} value={form.course_id}
              onChange={(e) => { set('course_id', e.target.value); set('batch_id', ''); }}>
              <option value="">{t('Select course…')}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
          </Field>
          <Field label="Batch" hint={form.course_id ? 'Only batches for the chosen course.' : 'Pick a course first to narrow this list.'}>
            <select className={inputClsCompact} value={form.batch_id} onChange={(e) => set('batch_id', e.target.value)}>
              <option value="">{t('Select batch…')}</option>
              {batchOptions.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </Field>
          <Field label="Admission date">
            <input type="date" className={inputClsCompact} value={form.admission_date?.slice?.(0, 10) || ''}
              onChange={(e) => set('admission_date', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={inputClsCompact} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['active', 'completed', 'dropped', 'suspended', 'inactive'].map((v) => <option key={v} value={v}>{t(v)}</option>)}
            </select>
          </Field>
        </Section>

        <Section icon={Icons.team} title="Guardian / emergency contact" dense cols={1}
          className="xl:col-span-3">
          <Field label="Guardian name">
            <input className={inputClsCompact} value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} placeholder="Parent or guardian" />
          </Field>
          <Field label="Guardian mobile">
            <input className={inputClsCompact} value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} placeholder="9876500000" />
          </Field>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {t('Used only for emergencies and fee reminders.')}
          </p>
        </Section>
      </div>
    </form>
  );
};

export default StudentForm;
