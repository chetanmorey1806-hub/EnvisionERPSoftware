/**
 * Global CapsLock aid — ported from the bk-steels portal.
 *
 * Data entry staff type names, roll numbers and course codes all day, and the
 * same student ends up as "Rahul", "RAHUL" and "rahul" on three screens. With
 * this on, everything typed into a text field is forced to UPPERCASE as it is
 * typed, so a record reads the same wherever it is printed.
 *
 * What it never touches: passwords, emails, numbers, dates and the sign-in
 * screens — casing is meaningful there, and forcing it would lock people out.
 *
 * The switch itself lives on Settings → Typing. It is per session; the
 * "start every session with it on" preference is per device.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'capsLockEnabled';   // this session's choice
const DEFAULT_KEY = 'capsLockDefaultOn'; // per-device default; absent means OFF
const EVENT_NAME = 'erp:capslock-change';

// Input types where casing is semantic — never rewrite these.
const SKIP_TYPES = new Set([
  'password', 'email', 'number', 'url', 'tel', 'date', 'datetime-local',
  'time', 'month', 'week', 'color', 'range', 'file', 'checkbox', 'radio',
  'hidden', 'submit', 'button', 'reset', 'image', 'search',
]);

export function isCapsLockOn() {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v !== null) return v === '1';
    // Nothing chosen this session — fall back to the device preference.
    return localStorage.getItem(DEFAULT_KEY) === '1';
  } catch {
    return false; // private mode: behave as off rather than throwing on a keystroke
  }
}

export function setCapsLock(on) {
  try { sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { on } }));
}

export function isCapsLockDefaultOn() {
  try { return localStorage.getItem(DEFAULT_KEY) === '1'; } catch { return false; }
}

export function setCapsLockDefault(on) {
  try { localStorage.setItem(DEFAULT_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** `const [on, setOn] = useCapsLock()` — re-renders when anything flips it. */
export function useCapsLock() {
  const [on, setOn] = useState(() => isCapsLockOn());
  useEffect(() => {
    const handler = (e) => setOn(!!e.detail?.on);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
  return [on, setCapsLock];
}

const EMAIL_LIKE_RE = /e[\s_-]?mail|emailid|email_address|emailaddress/i;

function isEmailLike(el) {
  const probe = [
    el.name, el.id, el.placeholder,
    el.getAttribute?.('aria-label'), el.getAttribute?.('autocomplete'),
  ].filter(Boolean).join(' ');
  if (EMAIL_LIKE_RE.test(probe)) return true;
  const lbl =
    el.closest?.('label')?.innerText ||
    (el.id && document.querySelector?.(`label[for="${CSS.escape(el.id)}"]`)?.innerText) ||
    '';
  return EMAIL_LIKE_RE.test(lbl);
}

function shouldTransform(el) {
  if (!el) return false;
  // An escape hatch for one field: <input data-no-caps="true" />
  if (el.dataset?.noCaps === 'true') return false;
  if (el.tagName === 'TEXTAREA') return !isEmailLike(el);
  if (el.tagName !== 'INPUT') return false;
  const type = (el.type || 'text').toLowerCase();
  if (SKIP_TYPES.has(type)) return false;
  return !isEmailLike(el);
}

// The auth screens are off-limits: a username may be case-sensitive and the
// password field would be the only thing left readable.
const SKIP_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
function isSkippedPath() {
  if (typeof window === 'undefined') return false;
  const p = window.location?.pathname || '';
  return SKIP_PATHS.some((pref) => p.startsWith(pref));
}

/**
 * One capture-phase listener for the whole app, installed once at start-up.
 *
 * The value is written through React's own value setter so React sees the
 * change and does not put the lower-case text back on the next render — and
 * the caret is restored, or typing in the middle of a word would jump to the
 * end on every key.
 */
export function installGlobalCapsLockListener() {
  if (typeof document === 'undefined' || document.__capsLockInstalled) return;
  document.__capsLockInstalled = true;

  const onInput = (e) => {
    if (!isCapsLockOn() || isSkippedPath()) return;
    const el = e.target;
    if (!shouldTransform(el)) return;
    const v = el.value;
    if (typeof v !== 'string') return;
    const up = v.toUpperCase();
    if (up === v) return;

    let start = null;
    let end = null;
    try { start = el.selectionStart; end = el.selectionEnd; } catch { /* not a text input */ }

    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement?.prototype
      : window.HTMLInputElement?.prototype;
    const setter = proto && Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    // No re-dispatch: this runs in the capture phase, so React's own onChange
    // has not fired yet and will read the value we just wrote.
    if (setter) setter.call(el, up); else el.value = up;

    if (start !== null && end !== null) {
      try { el.setSelectionRange(start, end); } catch { /* ignore */ }
    }
  };

  document.addEventListener('input', onInput, true);
}
