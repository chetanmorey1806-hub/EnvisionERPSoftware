import React, { useState } from 'react';
import Modal from './Modal';
import { shareApi } from '../../api/shareApi';

/**
 * Share a document (PDF, certificate, receipt) by email.
 * `attachmentUrl` must be an /uploads/... path — the server rejects anything else.
 */
const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

const ShareByEmail = ({ open, onClose, title = 'Send by email', defaultTo = '', subject = '', link = '', attachmentUrl = '' }) => {
  const [to, setTo] = useState(defaultTo);
  const [subj, setSubj] = useState(subject);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const send = async () => {
    setBusy(true); setError(''); setResult('');
    try {
      const res = await shareApi.email({ to, subject: subj, message, link, attachmentUrl });
      setResult(res.data.message);
      setTimeout(onClose, 1400);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to send the email.');
    } finally { setBusy(false); }
  };

  if (!open) return null;

  return (
    <Modal isOpen title={title} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
        <button onClick={send} disabled={busy || !to || !subj}
          className="px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50">
          {busy ? 'Sending…' : 'Send email'}
        </button>
      </>}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
        {result && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {result}</div>}

        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">To (comma-separated)</span>
          <input className={`${inputCls} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="student@example.com, parent@example.com" />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Subject</span>
          <input className={`${inputCls} mt-1`} value={subj} onChange={(e) => setSubj(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Message</span>
          <textarea rows={4} className={`${inputCls} mt-1`} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        {attachmentUrl && (
          <p className="text-[11px] text-gray-400">📎 Attaching <code>{attachmentUrl.split('/').pop()}</code></p>
        )}
        {link && <p className="text-[11px] text-gray-400">🔗 Includes link: {link}</p>}
      </div>
    </Modal>
  );
};

export default ShareByEmail;
