import React, { useEffect, useState } from 'react';
import Modal from '../../components/common/Modal';
import { PageHero } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { certificateApi } from '../../api/certificateApi';
import { studentApi } from '../../api/studentApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * Certificates.
 *
 * A certificate is the institute's public word that someone is qualified, so
 * this screen refuses to be a rubber stamp: pick a student and it shows the
 * four eligibility checks the server will apply (course finished, passed,
 * fees clear, attendance). Issue stays disabled until they pass — or until an
 * authorised person writes down WHY they are overriding, which is then printed
 * on the certificate's own record.
 */

const shortDate = (d) =>
  (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const CertificatesPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const [certs, setCerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const [issuing, setIssuing] = useState(null);   // { student_id, remarks, override_reason }
  const [check, setCheck] = useState(null);       // eligibility result
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 4000); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        certificateApi.getAll(),
        studentApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setCerts(c.data.data || []);
      setStudents(s.data.data?.items || s.data.data || []);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pickStudent = async (studentId) => {
    setIssuing((f) => ({ ...f, student_id: studentId }));
    setCheck(null);
    if (!studentId) return;
    setChecking(true);
    try {
      const r = await certificateApi.eligibility(studentId);
      setCheck(r.data.data);
    } catch (e) { fail(e); } finally { setChecking(false); }
  };

  const doIssue = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await certificateApi.issue({
        student_id: Number(issuing.student_id),
        remarks: issuing.remarks || undefined,
        override_reason: issuing.override_reason || undefined,
      });
      flash(`${t('Issued')} ${r.data.data.certificate_number}.`);
      setIssuing(null);
      setCheck(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doRevoke = async (cert) => {
    const reason = window.prompt(t('Why is this certificate being revoked?'));
    if (!reason?.trim()) return;
    try {
      await certificateApi.revoke(cert.id, reason.trim());
      flash(t('Certificate revoked.'));
      load();
    } catch (e) { fail(e); }
  };

  const eligible = check?.eligible;
  const canIssue = issuing?.student_id && (eligible || issuing?.override_reason?.trim());

  return (
    <div className="space-y-4">
      <PageHero
        tone="cyan"
        icon={Icons.certificates}
        title="Certificates"
        subtitle="Issued only when the course is finished, the marks are in and the fees are clear."
        action={can('certificates.issue') && (
          <button onClick={() => { setIssuing({ student_id: '', remarks: '', override_reason: '' }); setCheck(null); }}
            className="erp-hero-btn px-4 py-2.5 min-h-11">
            <Icons.plus size={15} aria-hidden="true" /> {t('Issue certificate')}
          </button>
        )}
      />

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      {loading ? (
        <p className="text-xs text-gray-500 py-8 text-center">{t('Loading…')}</p>
      ) : certs.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('No certificates issued yet')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('A certificate can be issued once a student completes their course.')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
              <tr>
                {['Certificate no', 'Student', 'Issued', 'Approved by', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {certs.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-slate-900">
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-700 dark:text-slate-300">{c.certificate_number}</td>
                  <td className="px-3 py-2">
                    <p className="font-bold text-gray-900 dark:text-slate-100">{c.student_name || '—'}</p>
                    <p className="text-[11px] text-gray-500">{c.admission_no || '—'}</p>
                    {String(c.remarks || '').startsWith('[OVERRIDE]') && (
                      <p className="text-[10px] font-bold text-amber-600 mt-0.5">{t('ISSUED BY OVERRIDE')}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{shortDate(c.issued_date)}</td>
                  <td className="px-3 py-2 text-gray-500">{c.approved_by_name || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      c.status === 'issued'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                    }`}>{t(c.status)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {can('certificates.revoke') && c.status === 'issued' && (
                      <button onClick={() => doRevoke(c)} className="text-[11px] font-bold text-rose-600">{t('Revoke')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {issuing && (
        <Modal isOpen size="md" title={t('Issue a certificate')} onClose={() => { setIssuing(null); setCheck(null); }}
          footer={<>
            <button onClick={() => { setIssuing(null); setCheck(null); }}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={doIssue} disabled={busy || !canIssue}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-white disabled:opacity-50 ${
                eligible ? 'bg-indigo-600' : 'bg-amber-600'
              }`}>
              {busy ? t('Saving…') : eligible ? t('Issue certificate') : t('Issue by override')}
            </button>
          </>}>
          <div className="space-y-3">
            <Field label="Student" required>
              <select className={inputClsCompact} value={issuing.student_id}
                onChange={(e) => pickStudent(e.target.value)}>
                <option value="">{t('Select a student')}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.admission_no || s.id})</option>
                ))}
              </select>
            </Field>

            {checking && <p className="text-[11px] text-gray-500">{t('Checking eligibility…')}</p>}

            {check && (
              <div className={`p-3 rounded-lg border ${
                eligible
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200'
              }`}>
                <p className={`text-[11px] font-bold uppercase mb-2 ${eligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {eligible ? t('Eligible') : t('Not eligible yet')}
                </p>
                <div className="space-y-1">
                  {check.checks.map((c) => (
                    <div key={c.key} className="flex items-start gap-2 text-[11px]">
                      <span className={c.passed ? 'text-emerald-600' : 'text-rose-600'}>{c.passed ? '✓' : '✗'}</span>
                      <div>
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{t(c.label)}</span>
                        <span className="text-gray-500"> — {c.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {check && !eligible && (
              <Field label="Override reason" required
                hint="Recorded on the certificate itself. Leave empty and issuing stays blocked.">
                <textarea rows={2} className={inputClsCompact} value={issuing.override_reason}
                  onChange={(e) => setIssuing({ ...issuing, override_reason: e.target.value })}
                  placeholder={t('e.g. Director approved — corporate sponsor settles next month')} />
              </Field>
            )}

            <Field label="Remarks">
              <input className={inputClsCompact} value={issuing.remarks}
                onChange={(e) => setIssuing({ ...issuing, remarks: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CertificatesPage;
