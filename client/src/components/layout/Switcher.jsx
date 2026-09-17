import React, { useCallback, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../common/icons';
import { useLayoutPrefs } from '../../hooks/useLayoutPrefs';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * The Switcher — the gear in the header opens it.
 *
 * A single panel for how the portal looks: colour mode, direction, which way
 * the menu runs, how wide the page is, what the brand colour is. Every choice
 * is stored, so the app comes back the way it was left.
 *
 * Nothing here is decorative — each option maps to a data attribute on <html>
 * that the CSS acts on, or to a value the layout reads directly. Options that
 * only make sense for one navigation style are disabled, not hidden, so the
 * panel keeps its shape.
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

const Group = ({ title, hint, children }) => (
  <section className="switcher-group">
    <h4>{title}</h4>
    <div className="switcher-options">{children}</div>
    {hint && <p className="switcher-hint">{hint}</p>}
  </section>
);

const Choice = ({ name, label, value, current, onChange, disabled }) => (
  <label className={`switcher-choice${disabled ? ' is-off' : ''}`}>
    <input
      type="radio"
      name={name}
      checked={current === value}
      disabled={disabled}
      onChange={() => onChange(value)}
    />
    <span>{label}</span>
  </label>
);

const Switcher = ({ open, onClose }) => {
  const [tab, setTab] = React.useState('styles');
  const { prefs, set, reset } = useLayoutPrefs();
  const { theme, setTheme } = useContext(ThemeContext);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const setPrimary = useCallback((hex) => {
    if (hex.toLowerCase() === String(prefs.primary).toLowerCase()) return;
    set('primary', hex);
  }, [prefs.primary, set]);

  const resetAll = useCallback(() => {
    setTheme('light');
    reset();
  }, [reset, setTheme]);

  if (!open) return null;

  const horizontal = prefs.nav === 'horizontal';
  const sidemenuHint = horizontal
    ? 'These apply to the vertical navigation — switch Navigation Styles to Vertical to use them.'
    : null;

  return createPortal(
    <>
      <div className="switcher-scrim" onClick={onClose} />
      <aside className="switcher" role="dialog" aria-label="Switcher">
        <header className="switcher-head">
          <h3>Switcher</h3>
          <button type="button" className="switcher-close" onClick={onClose} aria-label="Close">
            <Icons.close size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="switcher-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'styles'}
            className={tab === 'styles' ? 'active' : ''} onClick={() => setTab('styles')}>
            Theme Styles
          </button>
          <button type="button" role="tab" aria-selected={tab === 'colors'}
            className={tab === 'colors' ? 'active' : ''} onClick={() => setTab('colors')}>
            Theme Colors
          </button>
        </div>

        <div className="switcher-body">
          {tab === 'styles' ? (
            <>
              <Group title="Theme Color Mode:">
                <Choice name="sw-mode" label="Light" value="light" current={theme} onChange={setTheme} />
                <Choice name="sw-mode" label="Dark" value="dark" current={theme} onChange={setTheme} />
                <Choice name="sw-mode" label="Device" value="system" current={theme} onChange={setTheme} />
              </Group>

              <Group title="Directions:">
                <Choice name="sw-dir" label="LTR" value="ltr" current={prefs.dir} onChange={(v) => set('dir', v)} />
                <Choice name="sw-dir" label="RTL" value="rtl" current={prefs.dir} onChange={(v) => set('dir', v)} />
              </Group>

              <Group title="Navigation Styles:" hint="Vertical puts the menu down the side; horizontal keeps it under the header.">
                <Choice name="sw-nav" label="Vertical" value="vertical" current={prefs.nav} onChange={(v) => set('nav', v)} />
                <Choice name="sw-nav" label="Horizontal" value="horizontal" current={prefs.nav} onChange={(v) => set('nav', v)} />
              </Group>

              <Group title="Vertical &amp; Horizontal Menu Styles:">
                <Choice name="sw-ms" label="Menu Click" value="click" current={prefs.menuStyle} onChange={(v) => set('menuStyle', v)} />
                <Choice name="sw-ms" label="Menu Hover" value="hover" current={prefs.menuStyle} onChange={(v) => set('menuStyle', v)} />
                <Choice name="sw-ms" label="Icon Click" value="icon-click" current={prefs.menuStyle} onChange={(v) => set('menuStyle', v)} />
                <Choice name="sw-ms" label="Icon Hover" value="icon-hover" current={prefs.menuStyle} onChange={(v) => set('menuStyle', v)} />
              </Group>

              <Group title="Sidemenu Layout Styles:" hint={sidemenuHint}>
                <Choice name="sw-sm" label="Default Menu" value="default" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
                <Choice name="sw-sm" label="Closed Menu" value="closed" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
                <Choice name="sw-sm" label="Icon Text" value="icon-text" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
                <Choice name="sw-sm" label="Icon Overlay" value="icon-overlay" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
                <Choice name="sw-sm" label="Detached" value="detached" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
                <Choice name="sw-sm" label="Double Menu" value="double" current={prefs.sidemenu} disabled={horizontal} onChange={(v) => set('sidemenu', v)} />
              </Group>

              <Group title="Page Styles:">
                <Choice name="sw-ps" label="Regular" value="regular" current={prefs.pageStyle} onChange={(v) => set('pageStyle', v)} />
                <Choice name="sw-ps" label="Classic" value="classic" current={prefs.pageStyle} onChange={(v) => set('pageStyle', v)} />
                <Choice name="sw-ps" label="Modern" value="modern" current={prefs.pageStyle} onChange={(v) => set('pageStyle', v)} />
              </Group>

              <Group title="Layout Width Styles:">
                <Choice name="sw-w" label="Full Width" value="full" current={prefs.width} onChange={(v) => set('width', v)} />
                <Choice name="sw-w" label="Boxed" value="boxed" current={prefs.width} onChange={(v) => set('width', v)} />
              </Group>

              <Group title="Menu Positions:">
                <Choice name="sw-mp" label="Fixed" value="fixed" current={prefs.menuPos} onChange={(v) => set('menuPos', v)} />
                <Choice name="sw-mp" label="Scrollable" value="scrollable" current={prefs.menuPos} onChange={(v) => set('menuPos', v)} />
              </Group>

              <Group title="Header Positions:">
                <Choice name="sw-hp" label="Fixed" value="fixed" current={prefs.headerPos} onChange={(v) => set('headerPos', v)} />
                <Choice name="sw-hp" label="Scrollable" value="scrollable" current={prefs.headerPos} onChange={(v) => set('headerPos', v)} />
              </Group>

              <Group title="Loader:" hint="The brand loader shown while a page is being opened.">
                <Choice name="sw-ld" label="Enable" value="enable" current={prefs.loader} onChange={(v) => set('loader', v)} />
                <Choice name="sw-ld" label="Disable" value="disable" current={prefs.loader} onChange={(v) => set('loader', v)} />
              </Group>
            </>
          ) : (
            <>
              <Group title="Menu Colors:" hint="The side menu, and the menu bar under the header.">
                <Choice name="sw-mc" label="Light" value="light" current={prefs.menuSkin} onChange={(v) => set('menuSkin', v)} />
                <Choice name="sw-mc" label="Dark" value="dark" current={prefs.menuSkin} onChange={(v) => set('menuSkin', v)} />
                <Choice name="sw-mc" label="Color" value="color" current={prefs.menuSkin} onChange={(v) => set('menuSkin', v)} />
                <Choice name="sw-mc" label="Gradient" value="gradient" current={prefs.menuSkin} onChange={(v) => set('menuSkin', v)} />
              </Group>

              <Group title="Header Colors:">
                <Choice name="sw-hc" label="Gradient" value="gradient" current={prefs.headerSkin} onChange={(v) => set('headerSkin', v)} />
                <Choice name="sw-hc" label="Light" value="light" current={prefs.headerSkin} onChange={(v) => set('headerSkin', v)} />
                <Choice name="sw-hc" label="Dark" value="dark" current={prefs.headerSkin} onChange={(v) => set('headerSkin', v)} />
                <Choice name="sw-hc" label="Color" value="color" current={prefs.headerSkin} onChange={(v) => set('headerSkin', v)} />
              </Group>

              <Group title="Theme Primary:" hint="Buttons, links, the header and every accent follow this colour.">
                <div className="switcher-swatches">
                  {PRIMARIES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`switcher-swatch${String(prefs.primary).toLowerCase() === hex ? ' active' : ''}`}
                      style={{ background: hex }}
                      title={hex}
                      aria-label={`Brand colour ${hex}`}
                      onClick={() => setPrimary(hex)}
                    />
                  ))}
                  <label className="switcher-swatch custom" title="Pick any colour">
                    <input type="color" value={prefs.primary} onChange={(e) => setPrimary(e.target.value)} />
                    <Icons.plus size={14} aria-hidden="true" />
                  </label>
                </div>
              </Group>

              <Group title="Theme Background:" hint="A tint for the page behind the cards.">
                <div className="switcher-swatches">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      className={`switcher-swatch${prefs.bg === b.key ? ' active' : ''}`}
                      style={{ background: b.swatch }}
                      title={b.label}
                      aria-label={`${b.label} background`}
                      onClick={() => set('bg', b.key)}
                    />
                  ))}
                </div>
              </Group>
            </>
          )}
        </div>

        <footer className="switcher-foot">
          <button type="button" className="switcher-reset" onClick={resetAll}>Reset</button>
        </footer>
      </aside>
    </>,
    document.body
  );
};

export default Switcher;
