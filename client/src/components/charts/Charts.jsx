import React, { useMemo, useState } from 'react';
import { useT } from '../../context/LanguageContext';

/**
 * Charts — plain SVG, no charting library.
 *
 * A chart library would be ~500KB to draw four shapes, and every one of them
 * fights the theme. These render from a `[{ label, value }]` array, scale to
 * their container via viewBox, and inherit the light/dark palette.
 *
 * The rule they all obey: **an empty series draws nothing and says so.** A chart
 * with no data must not render an axis and a flat line at zero — that reads as
 * "we measured, and the answer was zero", which is a different (and false)
 * claim from "nothing has happened yet".
 */

const EMPTY_H = 'h-40';

/** The one place "there is no data" is rendered, so every chart says it the same way. */
const NoData = ({ hint }) => {
  const { t } = useT();
  return (
    <div className={`${EMPTY_H} grid place-items-center rounded-lg border border-dashed border-gray-200 dark:border-slate-800`}>
      <div className="text-center px-4">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-600">{t('No data yet')}</p>
        {hint && <p className="text-[11px] text-gray-400 dark:text-slate-600 mt-0.5">{t(hint)}</p>}
      </div>
    </div>
  );
};

export const ChartCard = ({ title, subtitle, right, children }) => {
  const { t } = useT();
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t(title)}</h4>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{t(subtitle)}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
};

const monthLabel = (s) => {
  const [y, m] = String(s).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short' });
};
const dayLabel = (s) => {
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const niceMax = (max) => {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / mag) * mag;
};

/* ─────────────────────────── Area / line ─────────────────────────── */

export const AreaChart = ({ data = [], format = (v) => v, color = 'emerald', emptyHint }) => {
  const [hover, setHover] = useState(null);
  const { t } = useT();

  const live = data.some((d) => Number(d.value) > 0);
  if (!data.length || !live) return <NoData hint={emptyHint} />;

  const W = 600;
  const H = 160;
  const P = { l: 6, r: 6, t: 10, b: 20 };
  const max = niceMax(Math.max(...data.map((d) => Number(d.value))));
  const stepX = (W - P.l - P.r) / Math.max(data.length - 1, 1);
  const y = (v) => P.t + (1 - Number(v) / max) * (H - P.t - P.b);
  const x = (i) => P.l + i * stepX;

  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`;

  // `stop-color` is its own SVG property — a Tailwind `fill-*` class on a <stop>
  // does nothing, which is why the gradient came out grey. It needs a real colour.
  const tones = {
    emerald: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500', text: 'text-emerald-600', hex: '#10b981' },
    blue: { stroke: 'stroke-blue-500', fill: 'fill-blue-500', text: 'text-blue-600', hex: '#3b82f6' },
  };
  const c = tones[color] || tones.emerald;
  const id = `grad-${color}`;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.hex} stopOpacity="0.28" />
              <stop offset="100%" stopColor={c.hex} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline + two guides, drawn faint so the data is what you see */}
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={P.l} x2={W - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)}
              className="stroke-gray-100 dark:stroke-slate-800" strokeWidth="1" />
          ))}

          <path d={area} fill={`url(#${id})`} />
          <path d={line} fill="none" className={c.stroke} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

          {pts.map(([px, py], i) => (
            <g key={data[i].label}>
              {hover === i && (
                <line x1={px} x2={px} y1={P.t} y2={H - P.b}
                  className="stroke-gray-300 dark:stroke-slate-600" strokeWidth="1" strokeDasharray="3 3" />
              )}
              <circle cx={px} cy={py} r={hover === i ? 4 : 0} className={c.fill} />
              {/* a wide invisible hit area — hovering a 2px dot is a nuisance */}
              <rect x={px - stepX / 2} y={0} width={stepX} height={H} fill="transparent"
                onMouseEnter={() => setHover(i)} />
            </g>
          ))}
        </svg>

        {hover !== null && (
          <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-2 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-bold shadow-lg">
              {monthLabel(data[hover].label)} · {format(data[hover].value)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={d.label}
            className={`text-[9px] ${hover === i ? 'text-gray-700 dark:text-slate-200 font-bold' : 'text-gray-400'}`}>
            {monthLabel(d.label)}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {t('Peak')}: <b className={c.text}>{format(Math.max(...data.map((d) => d.value)))}</b>
      </p>
    </div>
  );
};

/* ─────────────────────────── Bars ─────────────────────────── */

export const BarChart = ({ data = [], format = (v) => v, emptyHint }) => {
  const [hover, setHover] = useState(null);
  const live = data.some((d) => Number(d.value) > 0);
  if (!data.length || !live) return <NoData hint={emptyHint} />;

  const max = Math.max(...data.map((d) => Number(d.value)));
  // Cap the tallest bar below the ceiling. At a true 100% it runs flush into the
  // card edge and reads as if it is overflowing, and there is no room left for
  // the hover label to sit above it.
  const CEIL = 88;

  return (
    <div>
      <div className="h-40 flex items-end gap-1 px-0.5">
        {data.map((d, i) => {
          const h = max ? (Number(d.value) / max) * CEIL : 0;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && (
                <span className="mb-1 px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-bold whitespace-nowrap">
                  {format(d.value)}
                </span>
              )}
              <div
                className={`w-full rounded-t transition-all ${
                  hover === i ? 'bg-emerald-600' : 'bg-emerald-500/70'
                }`}
                style={{ height: `${Math.max(h, Number(d.value) > 0 ? 2 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <span key={d.label}
            className={`flex-1 text-center text-[9px] ${
              hover === i ? 'text-gray-700 dark:text-slate-200 font-bold' : 'text-gray-400'
            }`}>
            {monthLabel(d.label)}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────── Donut ─────────────────────────── */

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const DonutChart = ({ data = [], format = (v) => v, emptyHint }) => {
  const [hover, setHover] = useState(null);
  const { t } = useT();

  const total = data.reduce((s, d) => s + Number(d.value), 0);
  if (!data.length || total <= 0) return <NoData hint={emptyHint} />;

  const R = 60;
  const STROKE = 22;
  const C = 2 * Math.PI * R;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const frac = Number(d.value) / total;
    const arc = { ...d, frac, dash: frac * C, offset, color: PALETTE[i % PALETTE.length] };
    offset += frac * C;
    return arc;
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0 -rotate-90">
        {arcs.map((a, i) => (
          <circle key={a.label} cx="80" cy="80" r={R} fill="none"
            stroke={a.color}
            strokeWidth={hover === i ? STROKE + 4 : STROKE}
            strokeDasharray={`${a.dash} ${C - a.dash}`}
            strokeDashoffset={-a.offset}
            className="transition-all cursor-pointer"
            opacity={hover === null || hover === i ? 1 : 0.35}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)} />
        ))}
      </svg>

      <div className="flex-1 min-w-0 space-y-1">
        {arcs.map((a, i) => (
          <div key={a.label}
            className={`flex items-center justify-between gap-2 text-[11px] cursor-pointer rounded px-1 ${
              hover === i ? 'bg-gray-50 dark:bg-slate-800' : ''
            }`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
              <span className="truncate text-gray-600 dark:text-slate-400">
                {t(String(a.label).replace(/_/g, ' '))}
              </span>
            </span>
            <span className="font-bold text-gray-800 dark:text-slate-200 whitespace-nowrap">
              {format(a.value)} · {Math.round(a.frac * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────── Attendance strip ─────────────────────────── */

/**
 * One column per day. A day nobody marked is drawn HOLLOW, not as a 0% bar —
 * "we didn't take the register" and "everybody was absent" are very different
 * facts and must not look the same.
 */
export const AttendanceStrip = ({ data = [], emptyHint }) => {
  const [hover, setHover] = useState(null);
  const { t } = useT();

  const anyMarked = data.some((d) => Number(d.marked) > 0);
  if (!data.length || !anyMarked) return <NoData hint={emptyHint} />;

  const avg = (() => {
    const days = data.filter((d) => Number(d.marked) > 0);
    return days.length ? Math.round(days.reduce((s, d) => s + Number(d.value), 0) / days.length) : 0;
  })();

  const CEIL = 88;   // headroom for the hover label; see BarChart

  return (
    <div>
      <div className="h-40 flex items-end gap-1 px-0.5">
        {data.map((d, i) => {
          const marked = Number(d.marked) > 0;
          const v = Number(d.value);
          const tone = !marked ? '' : v >= 85 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && (
                <span className="mb-1 px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-bold whitespace-nowrap">
                  {marked ? `${v}% · ${d.present}/${d.marked}` : t('not marked')}
                </span>
              )}
              {marked ? (
                <div className={`w-full rounded-t ${tone} ${hover === i ? 'opacity-100' : 'opacity-80'}`}
                  style={{ height: `${Math.max((v / 100) * CEIL, 2)}%` }} />
              ) : (
                <div className="w-full h-1.5 rounded border border-dashed border-gray-300 dark:border-slate-700" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-gray-400">
          {t('Average on days that were marked')}: <b className="text-gray-700 dark:text-slate-200">{avg}%</b>
        </span>
        <span className="text-gray-400">{dayLabel(data[0].label)} — {dayLabel(data[data.length - 1].label)}</span>
      </div>
    </div>
  );
};
