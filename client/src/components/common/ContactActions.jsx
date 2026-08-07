import React from 'react';
import { Icons } from './icons';

/**
 * WhatsApp + Email + Call actions for a person (student, trainer, admin).
 *
 * WhatsApp uses a `wa.me` deep-link, which opens WhatsApp (app or web) with the
 * message pre-filled. This needs no API key and works today. Sending messages
 * *programmatically* (without the user pressing send) requires the Meta
 * WhatsApp Business API — a verified number and pre-approved templates.
 */

/** Normalise an Indian phone number to E.164 digits for wa.me. */
export function waNumber(phone, defaultCountry = '91') {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `${defaultCountry}${digits}`;      // local
  if (digits.startsWith('0')) return `${defaultCountry}${digits.slice(1)}`;
  return digits;                                                       // already has country code
}

export function waLink(phone, text = '') {
  const num = waNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function mailtoLink(email, subject = '', body = '') {
  if (!email) return null;
  const q = [];
  if (subject) q.push(`subject=${encodeURIComponent(subject)}`);
  if (body) q.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${q.length ? `?${q.join('&')}` : ''}`;
}

const btn =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg transition press ' +
  'disabled:opacity-30 disabled:pointer-events-none';

const ContactActions = ({ name, phone, email, message = '', onShare, size = 'md' }) => {
  const greeting = message || `Hello ${name || ''}, this is Envision Computer Training Institute.`;
  const wa = waLink(phone, greeting);
  const mail = mailtoLink(email, 'Envision Computer Training Institute', greeting);

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={wa || undefined}
        target="_blank"
        rel="noreferrer"
        aria-label={phone ? `WhatsApp ${name}` : 'No phone number on file'}
        title={phone ? `WhatsApp ${phone}` : 'No phone number on file'}
        className={`${btn} ${wa
          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-300 dark:bg-slate-800 pointer-events-none'}`}
      >
        <Icons.chat size={16} />
      </a>

      <a
        href={mail || undefined}
        aria-label={email ? `Email ${name}` : 'No email on file'}
        title={email ? `Email ${email}` : 'No email on file'}
        className={`${btn} ${mail
          ? 'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400'
          : 'bg-gray-100 text-gray-300 dark:bg-slate-800 pointer-events-none'}`}
      >
        <Icons.mail size={16} />
      </a>

      {onShare && (
        <button
          onClick={onShare}
          aria-label="Send a document by email"
          title="Send a document by email"
          className={`${btn} bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400`}
        >
          <Icons.upload size={16} />
        </button>
      )}
    </div>
  );
};

export default ContactActions;
