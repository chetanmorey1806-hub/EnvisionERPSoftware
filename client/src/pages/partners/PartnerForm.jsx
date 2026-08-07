import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../../components/common/icons';
import { Field, Section, FormHeader, FormError, FormSkeleton, inputCls } from '../../components/form/FormKit';
import { useT } from '../../context/LanguageContext';
import { partnerApi } from '../../api/partnerApi';

/**
 * Corporate partner — New / Edit.
 *
 * PAN and GSTIN are checked here as you type AND again on the server. A GSTIN
 * carries the holder's PAN inside it (characters 3–12), so entering the GSTIN
 * fills the PAN automatically and a mismatch is flagged before you can save.
 */
const EMPTY = {
  name: '', partner_type: 'both', pan: '', gst: '',
  corp_city: '', corp_state: '', corp_address: '', venue_address: '',
  website: '', notes: '',
};

const EMPTY_CONTACT = { name: '', designation: '', phone: '', email: '', is_primary: false };

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const TYPES = [
  { value: 'both', label: 'Hiring + Training' },
  { value: 'training', label: 'Corporate training only' },
  { value: 'hiring', label: 'Hiring only' },
];

const PartnerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    partnerApi.getById(id)
      .then((r) => {
        const p = r.data.data || {};
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])) });
        setContacts(p.contacts || []);
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load the partner.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Typing a GSTIN fills the PAN from inside it — one less thing to key in wrong.
  const onGst = (raw) => {
    const gst = raw.toUpperCase().replace(/\s+/g, '');
    set('gst', gst);
    if (GST_RE.test(gst) && !form.pan) set('pan', gst.slice(2, 12));
  };

  const panError = form.pan && !PAN_RE.test(form.pan)
    ? 'PAN must look like ABCDE1234F.' : '';
  const gstError = form.gst && !GST_RE.test(form.gst)
    ? 'GSTIN must be 15 characters, e.g. 27ABCDE1234F1Z5.' : '';
  const mismatch = !panError && !gstError && form.pan && form.gst && form.gst.slice(2, 12) !== form.pan
    ? `This GSTIN contains PAN ${form.gst.slice(2, 12)}, which does not match the PAN above.` : '';

  const setContact = (i, k, v) =>
    setContacts((list) => list.map((c, idx) => {
      if (idx !== i) return k === 'is_primary' && v ? { ...c, is_primary: false } : c;
      return { ...c, [k]: v };
    }));

  const addContact = () => setContacts((l) => [...l, { ...EMPTY_CONTACT, _new: true }]);
  const dropContact = (i) => setContacts((l) => l.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    if (panError || gstError || mismatch) { setError(panError || gstError || mismatch); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, contacts: contacts.filter((c) => c.name.trim()) };

      if (!isEdit) {
        await partnerApi.create(payload);
      } else {
        await partnerApi.update(id, form);
        // Contacts are their own resource on edit, so sync them individually.
        for (const c of contacts) {
          if (!c.name.trim()) continue;
          const body = {
            name: c.name, designation: c.designation, phone: c.phone,
            email: c.email, is_primary: !!c.is_primary,
          };
          if (c.id) await partnerApi.updateContact(id, c.id, body);
          else await partnerApi.addContact(id, body);
        }
      }
      navigate('/partners', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save the partner.');
    } finally { setSaving(false); }
  };

  const removeContact = async (c, i) => {
    if (isEdit && c.id) {
      try { await partnerApi.deleteContact(id, c.id); } catch { /* fall through to UI removal */ }
    }
    dropContact(i);
  };

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={save} className="space-y-5">
      <FormHeader
        title={isEdit ? 'Edit Partner' : 'New Partner'}
        subtitle="The company, its tax identity for invoicing, and the people you deal with."
        onCancel={() => navigate('/partners')}
        saving={saving}
        disabled={!form.name || !!panError || !!gstError || !!mismatch}
        saveLabel={isEdit ? 'Update partner' : 'Add partner'}
      />

      <FormError error={error} />

      <Section icon={Icons.team} title="Company">
        <Field label="Company name" required>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="Infotech Solutions Pvt. Ltd." />
        </Field>
        <Field label="Relationship" hint="What we actually do with them.">
          <select className={inputCls} value={form.partner_type} onChange={(e) => set('partner_type', e.target.value)}>
            {TYPES.map((x) => <option key={x.value} value={x.value}>{t(x.label)}</option>)}
          </select>
        </Field>
        <Field label="Website">
          <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)}
            placeholder="https://example.com" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" hint="Anything the team should know before calling them.">
            <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section icon={Icons.fees} title="Tax identity (for invoicing)">
        <Field label="GSTIN" hint="15 characters. Filling this fills the PAN for you.">
          <input className={`${inputCls} font-mono uppercase`} value={form.gst}
            onChange={(e) => onGst(e.target.value)} placeholder="27ABCDE1234F1Z5" maxLength={15} />
          {gstError && <span className="mt-1 block text-[10px] font-bold text-rose-600">{t(gstError)}</span>}
        </Field>
        <Field label="PAN">
          <input className={`${inputCls} font-mono uppercase`} value={form.pan}
            onChange={(e) => set('pan', e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="ABCDE1234F" maxLength={10} />
          {panError && <span className="mt-1 block text-[10px] font-bold text-rose-600">{t(panError)}</span>}
        </Field>
        {mismatch && (
          <div className="sm:col-span-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-2">
            <Icons.warning size={14} className="shrink-0 mt-px" /> {mismatch}
          </div>
        )}
        <div className="sm:col-span-2 p-3 rounded-lg bg-brand-50/60 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900 text-[11px] text-brand-800 dark:text-brand-300">
          {t('Both are optional — but a GST invoice cannot be raised without a valid GSTIN.')}
        </div>
      </Section>

      <Section icon={Icons.team} title="Addresses">
        <Field label="Corporate office — city">
          <input className={inputCls} value={form.corp_city} onChange={(e) => set('corp_city', e.target.value)}
            placeholder="Pune" />
        </Field>
        <Field label="Corporate office — state">
          <input className={inputCls} value={form.corp_state} onChange={(e) => set('corp_state', e.target.value)}
            placeholder="Maharashtra" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Corporate office — full address" hint="This is the address printed on their invoice.">
            <textarea rows={2} className={inputCls} value={form.corp_address}
              onChange={(e) => set('corp_address', e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Training venue" hint="Where on-site training runs, if it is not our campus.">
            <textarea rows={2} className={inputCls} value={form.venue_address}
              onChange={(e) => set('venue_address', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ---- contacts ---- */}
      <section className="erp-card p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            <Icons.students size={14} /> {t('Contact people')}
          </h2>
          <button type="button" onClick={addContact}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 press">
            <Icons.plus size={13} /> {t('Add contact')}
          </button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-gray-400">
            {t('No contacts yet. Add the HR or L&D person you actually speak to.')}
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((c, i) => (
              <div key={c.id || `new-${i}`}
                className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input className={inputCls} value={c.name} onChange={(e) => setContact(i, 'name', e.target.value)}
                    placeholder={t('Name')} />
                  <input className={inputCls} value={c.designation || ''} onChange={(e) => setContact(i, 'designation', e.target.value)}
                    placeholder={t('Designation, e.g. HR Manager')} />
                  <input className={inputCls} value={c.phone || ''} onChange={(e) => setContact(i, 'phone', e.target.value)}
                    placeholder={t('Phone')} />
                  <input type="email" className={inputCls} value={c.email || ''} onChange={(e) => setContact(i, 'email', e.target.value)}
                    placeholder={t('Email')} />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600 dark:text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={!!c.is_primary} className="h-3.5 w-3.5 rounded accent-brand-600"
                      onChange={(e) => setContact(i, 'is_primary', e.target.checked)} />
                    {t('Primary contact')}
                  </label>
                  <button type="button" onClick={() => removeContact(c, i)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline press">
                    <Icons.trash size={12} /> {t('Remove')}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-400">{t('Only one contact can be primary — ticking a new one unticks the old.')}</p>
          </div>
        )}
      </section>
    </form>
  );
};

export default PartnerForm;
