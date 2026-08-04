import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { Icons } from '../../components/common/icons';
import { Field, Section, FormHeader, FormError, FormSkeleton, inputCls } from '../../components/form/FormKit';
import { useT } from '../../context/LanguageContext';
import { facultyApi } from '../../api/facultyApi';

/**
 * Trainer — New / Edit.
 *
 * Creating a trainer here creates the domain record. A trainer who signs up on
 * the trainer portal gets this record provisioned automatically on OTP verify,
 * so both paths end with a faculty row — without one, every trainer endpoint
 * 403s.
 */
const EMPTY = {
  name: '', email: '', phone: '', department: '', designation: '',
  specialization: '', qualification: '', experience: '',
  joined_at: '', status: 'active',
};

const TrainerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    facultyApi.getById(id)
      .then((r) => {
        const f = r.data.data || {};
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v ?? ''])) });
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load the trainer.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (payload.experience === '') delete payload.experience;
      else payload.experience = Number(payload.experience);
      ['joined_at'].forEach((k) => { if (!payload[k]) delete payload[k]; });

      if (isEdit) await facultyApi.update(id, payload);
      else await facultyApi.create(payload);
      navigate('/trainers', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the trainer.');
    } finally { setSaving(false); }
  };

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={save} className="space-y-5">
      <Breadcrumb items={[{ label: t('Master') }, { label: t('Trainers'), path: '/trainers' }, { label: isEdit ? t('Edit') : t('New') }]} />

      <FormHeader
        title={isEdit ? 'Edit Trainer' : 'New Trainer'}
        subtitle={isEdit
          ? 'Update the trainer record.'
          : 'Add a trainer so they can be assigned to batches.'}
        onCancel={() => navigate('/trainers')}
        saving={saving}
        disabled={!form.name}
        saveLabel={isEdit ? 'Update trainer' : 'Add trainer'}
      />

      <FormError error={error} />

      <Section icon={Icons.faculty} title="Trainer details">
        <Field label="Full name" required>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rahul Deshmukh" />
        </Field>
        <Field label="Email" hint="Used for their login and for institute email alerts.">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="trainer@example.com" />
        </Field>
        <Field label="Mobile number">
          <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9876543210" />
        </Field>
        <Field label="Joining date">
          <input type="date" className={inputCls} value={form.joined_at?.slice?.(0, 10) || ''}
            onChange={(e) => set('joined_at', e.target.value)} />
        </Field>
      </Section>

      <Section icon={Icons.briefcase} title="Role & expertise">
        <Field label="Department">
          <input className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Software Development" />
        </Field>
        <Field label="Designation">
          <input className={inputCls} value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Senior Trainer" />
        </Field>
        <Field label="Specialization" hint="The subjects they can actually teach.">
          <input className={inputCls} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="Python, Django, MySQL" />
        </Field>
        <Field label="Highest qualification">
          <input className={inputCls} value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="M.Tech Computer Science" />
        </Field>
        <Field label="Experience (years)">
          <input type="number" min="0" className={inputCls} value={form.experience} onChange={(e) => set('experience', e.target.value)} placeholder="5" />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['active', 'inactive'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </Field>
      </Section>
    </form>
  );
};

export default TrainerForm;
