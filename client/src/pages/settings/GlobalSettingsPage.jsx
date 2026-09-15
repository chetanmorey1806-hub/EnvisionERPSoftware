import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, Panel } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { Field, FieldGrid, SaveButton, inputCls } from '../../components/settings/SettingsKit';
import { usePermissions } from '../../hooks/usePermissions';
import { settingsApi } from '../../api/settingsApi';

/**
 * Global Settings — everything a document needs that is not the document.
 *
 * What its number looks like, whose letterhead it prints on, which account the
 * fee is paid into, and the terms a receipt or certificate carries when nobody
 * types any.
 *
 * Ported from the bk-steels Global Setting screen. Each card saves on its own,
 * because these are unrelated settings that happen to share a page — getting
 * the receipt prefix right should not mean re-saving the bank details.
 */

/** April–March, the Indian academic year: 2026 → "2026-27". */
const currentFy = () => {
  const d = new Date();
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/** What the next document number will actually read. */
const preview = (row) => {
  const pad = Math.max(1, Math.min(10, Number(row.padding) || 4));
  const n = String(Math.max(1, Number(row.next_number) || 1)).padStart(pad, '0');
  return `${row.prefix || ''}${n}${row.suffix || ''}`;
};

const Input = (props) => <input className={inputCls} {...props} />;

const GlobalSettingsPage = () => {
  const { can } = usePermissions();
  const editable = can('settings.update');

  const [fy] = useState(currentFy);
  const [series, setSeries] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);   // which card is saving
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([
      settingsApi.getNumbering(fy).then((r) => r.data.data || []).catch(() => []),
      settingsApi.getInstitutionProfile().then((r) => r.data.data || {}).catch(() => ({})),
    ]).then(([rows, prof]) => {
      if (!live) return;
      setSeries(rows);
      setProfile(prof);
      setLoading(false);
    });
    return () => { live = false; };
  }, [fy]);

  const setRow = useCallback((docType, key, v) => {
    setSeries((cur) => cur.map((r) => (r.doc_type === docType ? { ...r, [key]: v } : r)));
  }, []);
  const setProf = useCallback((key, v) => setProfile((cur) => ({ ...cur, [key]: v })), []);

  const saveSeries = async (row) => {
    if (!String(row.prefix || '').trim()) { setError('A prefix is required.'); return; }
    setBusy(row.doc_type); setError(''); setNote('');
    try {
      const r = await settingsApi.saveNumbering(row.doc_type, {
        fy: row.fy || fy,
        prefix: String(row.prefix).trim(),
        suffix: String(row.suffix || '').trim(),
        next_number: row.next_number,
        padding: row.padding,
      });
      const saved = r.data.data;
      setSeries((cur) => cur.map((x) => (x.doc_type === row.doc_type ? { ...x, ...saved } : x)));
      setNote(`${row.label} numbering saved.`);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save this numbering.');
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (fields, what) => {
    if (!String(profile?.name || '').trim()) { setError('The institute name is required.'); return; }
    setBusy(what); setError(''); setNote('');
    try {
      const body = Object.fromEntries(
        fields.map((k) => [k, String(profile[k] ?? '').trim() || null])
      );
      body.name = String(profile.name || '').trim();
      const r = await settingsApi.updateInstitutionProfile(body);
      setProfile(r.data.data || profile);
      setNote(`${what} saved.`);
    } catch (e) {
      setError(e.response?.data?.message || `Could not save ${what.toLowerCase()}.`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-gray-400 dark:text-slate-500">
        Loading global settings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHero
        tone="brand"
        icon={Icons.hash}
        title="Global Settings"
        subtitle="Document numbering and the details every printed document carries."
        meta={[{ label: 'Academic year', value: fy }]}
        action={
          <Link to="/settings" className="erp-hero-btn">
            <Icons.settings size={14} aria-hidden="true" /> Settings
          </Link>
        }
      />

      {(note || error) && (
        <div
          className={`erp-card px-4 py-3 text-xs font-medium ${
            error ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {error || note}
        </div>
      )}

      {!editable && (
        <div className="erp-card px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
          You can see these settings but not change them — that needs the
          <span className="font-semibold"> settings.update </span> permission.
        </div>
      )}

      {/* ── numbering, one card per document ─────────────────────────── */}
      {series.map((row) => (
        <Panel
          key={row.doc_type}
          title={`${row.label} numbering`}
          subtitle={row.note || `The running number on every ${row.label.toLowerCase()} raised this year`}
          icon={Icons.hash}
          tone="slate"
          action={editable && (
            <SaveButton onClick={() => saveSeries(row)} saving={busy === row.doc_type} />
          )}
        >
          <FieldGrid>
            <Field label="Prefix" hint="e.g. ENV/ADM/">
              <Input
                value={row.prefix ?? ''}
                disabled={!editable}
                onChange={(e) => setRow(row.doc_type, 'prefix', e.target.value)}
              />
            </Field>
            <Field label="Suffix" hint={`optional — e.g. /${fy}`}>
              <Input
                value={row.suffix ?? ''}
                placeholder="none"
                disabled={!editable}
                onChange={(e) => setRow(row.doc_type, 'suffix', e.target.value)}
              />
            </Field>
            <Field label="Next serial no.">
              <Input
                inputMode="numeric"
                value={row.next_number ?? 1}
                disabled={!editable}
                onChange={(e) => setRow(row.doc_type, 'next_number', e.target.value)}
              />
            </Field>
            <Field label="Digits" hint="0001 is four">
              <Input
                inputMode="numeric"
                value={row.padding ?? 4}
                disabled={!editable}
                onChange={(e) => setRow(row.doc_type, 'padding', e.target.value)}
              />
            </Field>
            <Field label="The next one will read" wide>
              <div className="font-mono text-sm font-bold text-brand-600 dark:text-brand-300 px-3 py-2.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20">
                {preview(row)}
              </div>
            </Field>
          </FieldGrid>
        </Panel>
      ))}

      {/* ── institute details ────────────────────────────────────────── */}
      <Panel
        title="Institute details"
        subtitle="The institute's official details, kept in one place for documents"
        icon={Icons.team}
        tone="brand"
        action={editable && (
          <SaveButton
            saving={busy === 'Institute details'}
            onClick={() => saveProfile(
              ['name', 'legal_name', 'tagline', 'registration_no', 'affiliation', 'address',
                'city', 'state', 'pincode', 'phone', 'email', 'website', 'gstin', 'pan',
                'academic_year', 'currency', 'timezone'],
              'Institute details'
            )}
          />
        )}
      >
        <FieldGrid>
          <Field label="Institute name">
            <Input value={profile.name ?? ''} placeholder="ENVISION INSTITUTE" disabled={!editable}
              onChange={(e) => setProf('name', e.target.value)} />
          </Field>
          <Field label="Legal / registered name">
            <Input value={profile.legal_name ?? ''} disabled={!editable}
              onChange={(e) => setProf('legal_name', e.target.value)} />
          </Field>
          <Field label="Tagline" hint="a short line that goes with the name">
            <Input value={profile.tagline ?? ''} placeholder="Skills that get hired" disabled={!editable}
              onChange={(e) => setProf('tagline', e.target.value)} />
          </Field>
          <Field label="Registration no.">
            <Input value={profile.registration_no ?? ''} disabled={!editable}
              onChange={(e) => setProf('registration_no', e.target.value)} />
          </Field>
          <Field label="Affiliation / board">
            <Input value={profile.affiliation ?? ''} placeholder="NSDC / University" disabled={!editable}
              onChange={(e) => setProf('affiliation', e.target.value)} />
          </Field>
          <Field label="GSTIN">
            <Input value={profile.gstin ?? ''} disabled={!editable}
              onChange={(e) => setProf('gstin', e.target.value.toUpperCase())} />
          </Field>
          <Field label="PAN">
            <Input value={profile.pan ?? ''} disabled={!editable}
              onChange={(e) => setProf('pan', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Address" wide>
            <Input value={profile.address ?? ''} disabled={!editable}
              onChange={(e) => setProf('address', e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={profile.city ?? ''} disabled={!editable}
              onChange={(e) => setProf('city', e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={profile.state ?? ''} disabled={!editable}
              onChange={(e) => setProf('state', e.target.value)} />
          </Field>
          <Field label="Pincode">
            <Input inputMode="numeric" value={profile.pincode ?? ''} disabled={!editable}
              onChange={(e) => setProf('pincode', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={profile.phone ?? ''} disabled={!editable}
              onChange={(e) => setProf('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={profile.email ?? ''} disabled={!editable}
              onChange={(e) => setProf('email', e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={profile.website ?? ''} disabled={!editable}
              onChange={(e) => setProf('website', e.target.value)} />
          </Field>
          <Field label="Academic year" hint="what new admissions are filed under">
            <Input value={profile.academic_year ?? ''} placeholder={fy} disabled={!editable}
              onChange={(e) => setProf('academic_year', e.target.value)} />
          </Field>
          <Field label="Currency">
            <Input value={profile.currency ?? ''} placeholder="INR" disabled={!editable}
              onChange={(e) => setProf('currency', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Timezone">
            <Input value={profile.timezone ?? ''} placeholder="Asia/Kolkata" disabled={!editable}
              onChange={(e) => setProf('timezone', e.target.value)} />
          </Field>
        </FieldGrid>
      </Panel>

      {/* ── scheduling policy ───────────────────────────────────────── */}
      {/* The batch conflict checks read these on every save: a batch outside
          the operating hours, or a trainer's batch over the daily limit, is
          refused. */}
      <Panel
        title="Scheduling policy"
        subtitle="The rules every new or changed batch is checked against"
        icon={Icons.clock}
        tone="violet"
        action={editable && (
          <SaveButton
            saving={busy === 'Scheduling policy'}
            onClick={() => saveProfile(
              ['open_time', 'close_time', 'max_batches_per_trainer_per_day'],
              'Scheduling policy'
            )}
          />
        )}
      >
        <FieldGrid>
          <Field label="Opens at" hint="no batch may start before this">
            <Input type="time" value={String(profile.open_time ?? '').slice(0, 5)} disabled={!editable}
              onChange={(e) => setProf('open_time', e.target.value)} />
          </Field>
          <Field label="Closes at" hint="no batch may run past this">
            <Input type="time" value={String(profile.close_time ?? '').slice(0, 5)} disabled={!editable}
              onChange={(e) => setProf('close_time', e.target.value)} />
          </Field>
          <Field label="Max batches per trainer per day" hint="lowering it never removes existing batches">
            <Input inputMode="numeric" value={profile.max_batches_per_trainer_per_day ?? ''} placeholder="4"
              disabled={!editable}
              onChange={(e) => setProf('max_batches_per_trainer_per_day', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </FieldGrid>
      </Panel>

      {/* ── bank + signatory ─────────────────────────────────────────── */}
      <Panel
        title="Bank details & signatory"
        subtitle="Where a fee is paid, and who signs for the institute"
        icon={Icons.bank}
        tone="green"
        action={editable && (
          <SaveButton
            saving={busy === 'Bank details'}
            onClick={() => saveProfile(
              ['bank_name', 'bank_branch', 'account_holder', 'account_no', 'ifsc', 'upi_id',
                'signatory_name', 'signatory_role'],
              'Bank details'
            )}
          />
        )}
      >
        <FieldGrid>
          <Field label="Bank name">
            <Input value={profile.bank_name ?? ''} disabled={!editable}
              onChange={(e) => setProf('bank_name', e.target.value)} />
          </Field>
          <Field label="Branch">
            <Input value={profile.bank_branch ?? ''} disabled={!editable}
              onChange={(e) => setProf('bank_branch', e.target.value)} />
          </Field>
          <Field label="A/C holder name">
            <Input value={profile.account_holder ?? ''} disabled={!editable}
              onChange={(e) => setProf('account_holder', e.target.value)} />
          </Field>
          <Field label="Account no.">
            <Input value={profile.account_no ?? ''} disabled={!editable}
              onChange={(e) => setProf('account_no', e.target.value)} />
          </Field>
          <Field label="IFSC code">
            <Input value={profile.ifsc ?? ''} disabled={!editable}
              onChange={(e) => setProf('ifsc', e.target.value.toUpperCase())} />
          </Field>
          <Field label="UPI ID" hint="for students paying by UPI">
            <Input value={profile.upi_id ?? ''} disabled={!editable}
              onChange={(e) => setProf('upi_id', e.target.value)} />
          </Field>
          <Field label="Signatory name" hint="the authorised signatory">
            <Input value={profile.signatory_name ?? ''} disabled={!editable}
              onChange={(e) => setProf('signatory_name', e.target.value)} />
          </Field>
          <Field label="Signatory role">
            <Input value={profile.signatory_role ?? ''} placeholder="Director / Principal" disabled={!editable}
              onChange={(e) => setProf('signatory_role', e.target.value)} />
          </Field>
        </FieldGrid>
      </Panel>

      {/* ── default terms ────────────────────────────────────────────── */}
      <Panel
        title="Default terms"
        subtitle="The standard wording for receipts and certificates"
        icon={Icons.terms}
        tone="amber"
        action={editable && (
          <SaveButton
            saving={busy === 'Default terms'}
            onClick={() => saveProfile(['receipt_terms', 'certificate_note'], 'Default terms')}
          />
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field
            label="Fee receipt terms"
            hint="Refund rule, instalment dates, the cheque-bounce line."
          >
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              disabled={!editable}
              placeholder={'1. Fees once paid are not refundable.\n2. Cheque subject to realisation.\n3. Produce this receipt for any fee query.'}
              value={profile.receipt_terms ?? ''}
              onChange={(e) => setProf('receipt_terms', e.target.value)}
            />
          </Field>
          <Field
            label="Certificate note"
            hint="The line under a course-completion certificate — verification URL, grading note, anything standard."
          >
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              disabled={!editable}
              placeholder={'This certificate can be verified at envision.edu/verify with the certificate number above.'}
              value={profile.certificate_note ?? ''}
              onChange={(e) => setProf('certificate_note', e.target.value)}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
};

export default GlobalSettingsPage;
