import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, Panel } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { Row, Segmented, Switch } from '../../components/settings/SettingsKit';
import { ThemeContext } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useLayoutPrefs } from '../../hooks/useLayoutPrefs';
import {
  useCapsLock, isCapsLockDefaultOn, setCapsLockDefault, isCapsLockOn,
} from '../../utils/capsLock';
import { settingsApi } from '../../api/settingsApi';

/**
 * Settings — the preferences, not the records.
 *
 * How the portal behaves on THIS device (appearance, language, the CapsLock
 * aid), plus the way through to the things that are records and therefore the
 * same for everyone: the letterhead and document numbering on Global Settings,
 * and the masters each module reads from.
 *
 * Ported from the bk-steels Setting screen, with the masters list rewritten for
 * an institute rather than a steel trader.
 */

/* Swatches offered for the brand colour, with the shipped red first. */
const PRIMARIES = ['#fb0404', '#e11d48', '#7c3aed', '#2563eb', '#0d9488', '#ea580c', '#0f172a'];
const BACKGROUNDS = [
  { key: 'default', label: 'Default', swatch: '#f3f4f6' },
  { key: 'slate', label: 'Slate', swatch: '#e8ecf3' },
  { key: 'navy', label: 'Navy', swatch: '#e6ecf6' },
  { key: 'plum', label: 'Plum', swatch: '#f2e9f3' },
  { key: 'forest', label: 'Forest', swatch: '#e7f1ea' },
];

/* The records every other module points at. Each has its own screen. */
const MASTERS = [
  { icon: Icons.courses, name: 'Courses & Syllabus', to: '/courses', note: 'What is taught, and for how long' },
  { icon: Icons.batches, name: 'Batches', to: '/batches', note: 'Timings, trainer and room per batch' },
  { icon: Icons.team, name: 'Classrooms & Labs', to: '/rooms', note: 'Where a batch can actually sit' },
  { icon: Icons.faculty, name: 'Trainers', to: '/trainers', note: 'Who teaches, and what they are rated' },
  { icon: Icons.staff, name: 'Staff', to: '/staff', note: 'Counsellors, office and support staff' },
  { icon: Icons.library, name: 'Library', to: '/library', note: 'Titles, copies and issue rules' },
  { icon: Icons.inventory, name: 'Inventory', to: '/inventory', note: 'Kits, stationery and assets' },
  { icon: Icons.briefcase, name: 'Corporate Partners', to: '/partners', note: 'Where students are placed' },
  { icon: Icons.users, name: 'User Management', to: '/users', permission: 'users.view', note: 'Who can sign in' },
  { icon: Icons.roles, name: 'Roles & Permissions', to: '/roles', permission: 'roles.view', note: 'What each role may do' },
];

const fmtDate = (v) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const SettingsPage = () => {
  const { theme, resolved, setTheme } = useContext(ThemeContext);
  const { lang, setLang, languages } = useT();
  const { can } = usePermissions();
  const { prefs, set, reset } = useLayoutPrefs();

  const [capsOn, setCapsOnState] = useCapsLock();
  const [capsDefault, setCapsDefault] = useState(isCapsLockDefaultOn);

  const [profile, setProfile] = useState(null);
  const [backups, setBackups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    settingsApi.getInstitutionProfile()
      .then((r) => setProfile(r.data.data || null))
      .catch(() => setProfile(null));
    settingsApi.getBackupLogs()
      .then((r) => setBackups(r.data.data || []))
      .catch(() => setBackups([]));
  }, []);

  const changeCapsDefault = (on) => {
    setCapsDefault(on);
    setCapsLockDefault(on);
    // Nothing has overridden it yet this session, so reflect it now too.
    let chosen = null;
    try { chosen = sessionStorage.getItem('capsLockEnabled'); } catch { /* private mode */ }
    if (chosen === null) setCapsOnState(on);
  };

  const runBackup = async () => {
    setBusy(true); setNote('');
    try {
      await settingsApi.triggerBackup();
      const r = await settingsApi.getBackupLogs();
      setBackups(r.data.data || []);
      setNote('Backup taken.');
    } catch (e) {
      setNote(e.response?.data?.message || 'Could not take a backup.');
    } finally {
      setBusy(false);
    }
  };

  const resetLook = () => {
    setTheme('light');
    reset();
    setNote('Appearance reset to the shipped defaults.');
  };

  return (
    <div className="space-y-5">
      <PageHero
        tone="slate"
        icon={Icons.settings}
        title="Settings"
        subtitle="How the portal behaves on this device — and the way through to what everyone shares."
        meta={[
          { label: 'Academic year', value: profile?.academic_year || '—' },
          { label: 'Appearance', value: theme === 'system' ? 'Device' : theme === 'dark' ? 'Dark' : 'Light' },
        ]}
        action={
          can('settings.view') && (
            <Link to="/settings/global" className="erp-hero-btn">
              <Icons.hash size={14} aria-hidden="true" /> Global Settings
            </Link>
          )
        }
      />

      {note && (
        <div className="erp-card px-4 py-3 text-xs font-medium text-gray-700 dark:text-slate-300">
          {note}
        </div>
      )}

      {/* ── appearance ───────────────────────────────────────────────── */}
      <Panel
        title="Appearance"
        subtitle="Saved in this browser. Each device can be set differently."
        icon={Icons.palette}
        tone="violet"
      >
        <Row
          label="Colour mode"
          hint={theme === 'system'
            ? `Following this device — currently ${resolved}`
            : theme === 'dark' ? 'Dark — easier at night and in a dim lab' : 'Light — the shipped look'}
        >
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light', icon: Icons.sun },
              { value: 'dark', label: 'Dark', icon: Icons.moon },
              { value: 'system', label: 'Device', icon: Icons.monitor },
            ]}
          />
        </Row>

        <Row label="Brand colour" hint="Buttons, links, the header and every accent follow this colour.">
          <div className="flex flex-wrap items-center gap-2">
            {PRIMARIES.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                aria-label={`Brand colour ${hex}`}
                onClick={() => set('primary', hex)}
                style={{ background: hex }}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  String(prefs.primary).toLowerCase() === hex
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-transparent'
                }`}
              />
            ))}
            <label
              className="h-7 w-7 rounded-full border border-dashed border-gray-300 dark:border-slate-600 grid place-items-center relative cursor-pointer text-gray-400"
              title="Pick any colour"
            >
              <input
                type="color"
                value={prefs.primary}
                onChange={(e) => set('primary', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Icons.plus size={13} aria-hidden="true" />
            </label>
          </div>
        </Row>

        <Row label="Page background" hint="A tint for the page behind the cards.">
          <div className="flex flex-wrap items-center gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                type="button"
                title={b.label}
                aria-label={`${b.label} background`}
                onClick={() => set('bg', b.key)}
                style={{ background: b.swatch }}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  prefs.bg === b.key ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-200 dark:border-slate-700'
                }`}
              />
            ))}
          </div>
        </Row>

        <Row
          label="Layout"
          hint={`${prefs.nav === 'horizontal' ? 'Horizontal menu' : 'Vertical menu'} · ${
            prefs.width === 'boxed' ? 'Boxed' : 'Full width'} · header ${prefs.headerPos}`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('erp:open-switcher'))}
              className="erp-btn erp-btn-outline text-xs px-3 py-2"
            >
              <Icons.sliders size={14} aria-hidden="true" /> Open the Switcher
            </button>
            <button type="button" onClick={resetLook} className="erp-btn erp-btn-soft text-xs px-3 py-2">
              <Icons.reset size={14} aria-hidden="true" /> Reset
            </button>
          </div>
        </Row>
      </Panel>

      {/* ── language & typing ────────────────────────────────────────── */}
      <Panel
        title="Language & typing"
        subtitle="The screen language, and the aid that keeps entered text consistent."
        icon={Icons.keyboard}
        tone="cyan"
      >
        <Row label="Screen language" hint="Menus, headings and buttons. Records stay as they were typed.">
          <Segmented
            value={lang}
            onChange={setLang}
            options={languages.map((l) => ({ value: l.code, label: l.short }))}
          />
        </Row>

        <Row
          label="CapsLock right now"
          hint={
            capsOn
              ? 'Text is being forced to UPPERCASE as it is typed'
              : 'Typing exactly as it is pressed'
          }
        >
          <Switch on={capsOn} onChange={(v) => setCapsOnState(v)} label="CapsLock for this session" />
        </Row>

        <Row
          label="Start every session with it on"
          hint="Applies the next time you sign in on this device"
        >
          <Switch on={capsDefault} onChange={changeCapsDefault} label="CapsLock on by default" />
        </Row>

        <p className="text-[11px] text-gray-500 dark:text-slate-400 pt-3 border-t border-gray-100 dark:border-slate-800">
          Names, roll numbers and course codes go in UPPERCASE so the same student reads the same on
          every screen and printout. Passwords, emails, numbers, dates and the sign-in screens are
          never touched.
        </p>
      </Panel>

      {/* ── the shared records ───────────────────────────────────────── */}
      <Panel
        title="Institute letterhead"
        subtitle="What prints on a receipt, an invoice and a certificate — the same for everyone."
        icon={Icons.team}
        tone="brand"
        action={
          <Link to="/settings/global" className="erp-btn erp-btn-outline text-xs px-3 py-2">
            Open Global Settings
          </Link>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Institute', value: profile?.name || '—' },
            { label: 'Phone', value: profile?.phone || '—' },
            { label: 'Email', value: profile?.email || '—' },
            { label: 'Academic year', value: profile?.academic_year || '—' },
          ].map((f) => (
            <div key={f.label} className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                {f.label}
              </p>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100 truncate mt-0.5">
                {f.value}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── masters ──────────────────────────────────────────────────── */}
      <Panel
        title="Masters"
        subtitle="These are records, not preferences — everyone signed in sees the same values."
        icon={Icons.layers}
        tone="amber"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MASTERS.filter((m) => !m.permission || can(m.permission)).map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 hover:border-brand-300 dark:hover:border-brand-500/40 transition"
            >
              <span className="erp-chip erp-chip-brand h-8 w-8 shrink-0">
                <m.icon size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-gray-800 dark:text-slate-100 truncate">
                  {m.name}
                </span>
                <span className="block text-[11px] text-gray-500 dark:text-slate-400">{m.note}</span>
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      {/* ── backups ──────────────────────────────────────────────────── */}
      <Panel
        title="Data & backups"
        subtitle="A snapshot of the database, kept on the server."
        icon={Icons.database}
        tone="green"
        action={
          can('settings.update') && (
            <button
              type="button"
              onClick={runBackup}
              disabled={busy}
              className="erp-btn erp-btn-primary text-xs px-4 py-2 disabled:opacity-60"
            >
              {busy ? 'Backing up…' : 'Back up now'}
            </button>
          )
        }
      >
        {backups.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">No backup has been taken yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {backups.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate font-mono">
                    {b.filename}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">{fmtDate(b.created_at)}</p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                    b.status === 'success'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                  }`}
                >
                  {b.size_kb} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── about ────────────────────────────────────────────────────── */}
      <Panel title="About this install" icon={Icons.help} tone="slate">
        <Row label="Server">
          <code className="text-[11px] text-gray-600 dark:text-slate-300">
            {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
          </code>
        </Row>
        <Row label="This device">
          <span className="text-xs text-gray-600 dark:text-slate-300">
            {navigator.onLine ? 'Online' : 'Offline — changes will not save'}
          </span>
        </Row>
        <Row label="CapsLock aid" hint="What a fresh session starts with on this device">
          <span className="text-xs text-gray-600 dark:text-slate-300">
            {isCapsLockOn() ? 'On now' : 'Off now'} · default {capsDefault ? 'on' : 'off'}
          </span>
        </Row>
      </Panel>
    </div>
  );
};

export default SettingsPage;
