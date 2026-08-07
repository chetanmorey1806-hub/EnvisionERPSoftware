import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import { useSocket } from '../../context/SocketContext';
import { Icons } from '../../components/common/icons';
import { adminApi } from '../../api/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';
import { INSTITUTE } from '../../components/common/Logo';
import { StatCard, StatGrid, Band, Panel } from '../../components/common/PageShell';
import { SkeletonCard } from '../../components/common/Skeleton';
import {
  ChartCard, AreaChart, BarChart, DonutChart, AttendanceStrip,
} from '../../components/charts/Charts';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const compact = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
};

/**
 * The Indian academic year runs April → March, so "this year" on 7 August 2026
 * is 2026-2027. Deriving it beats storing it — it can never go stale.
 */
const academicYears = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [start + 1, start, start - 1, start - 2].map((y) => `${y}-${y + 1}`);
};

const activityIcon = { student: Icons.students, fee: Icons.fees, enquiry: Icons.enquiries };

/**
 * The welcome band. A live clock is the one thing on this page that must not
 * be fetched, so it ticks locally on a 1s interval.
 */
const WelcomeHero = ({ year, onYearChange, years }) => {
  const { t } = useT();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="erp-hero">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {t('Welcome to')} {INSTITUTE.short}
          </h1>
          <p className="text-[13px] sm:text-sm font-semibold text-white/85 mt-1">
            {t('Training Institute ERP')} · {t('Live Overview')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="erp-hero-chip">
            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/70 mb-1">
              {t('Academic Year')}
            </span>
            <select
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
            >
              {years.map((y) => (
                /* The options render on the native menu surface, not the band,
                   so they need their own dark-on-light colours. */
                <option key={y} value={y} className="text-gray-900">
                  {t('FY')} {y}
                </option>
              ))}
            </select>
          </label>

          <div className="erp-hero-chip flex items-center gap-3">
            <Icons.clock size={22} strokeWidth={1.8} className="text-white/80" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold text-white/85 whitespace-nowrap">
                {now.toLocaleDateString('en-IN', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
              <p className="text-lg font-extrabold leading-tight tabular-nums">
                {now.toLocaleTimeString('en-IN', { hour12: true })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const Dashboard = () => {
  const { socket } = useSocket();
  const { can } = usePermissions();
  const { t } = useT();
  const navigate = useNavigate();

  const years = academicYears();
  const [year, setYear] = useState(years[1]);
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [risks, setRisks] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    dashboardApi.getStats()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load dashboard.'));
    dashboardApi.getCharts()
      .then((res) => setCharts(res.data.data))
      .catch(() => {});
    dashboardApi.getActivity()
      .then((res) => setActivity(res.data.data || []))
      .catch(() => {});

    // Critical AI additions — admin-only surfaces (403 for everyone else).
    if (can('students.view')) {
      adminApi.retentionRisks().then((r) => setRisks(r.data.data || [])).catch(() => {});
    }
    if (can('feedback.view')) {
      adminApi.escalations().then((r) => setEscalations(r.data.data || [])).catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  // Live: refresh the numbers whenever a domain event arrives over the socket.
  useEffect(() => {
    if (!socket) return undefined;
    const onEvent = () => load();
    socket.on('notification:new', onEvent);
    return () => socket.off('notification:new', onEvent);
  }, [socket]);

  return (
    <div className="space-y-5">
      <WelcomeHero year={year} onYearChange={setYear} years={years} />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-fade-in">
          {error}
        </div>
      )}

      {!stats ? (
        <StatGrid>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </StatGrid>
      ) : (
        <>
          {/* The headline figure, stated once and loudly. */}
          <Band
            icon={Icons.reports}
            label="Fees Collected (This Month)"
            value={money(stats.fees.collectedThisMonth)}
            note={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            footnote={`${stats.fees.transactions} ${t('transactions')}`}
          />

          <StatGrid>
            <StatCard
              icon={Icons.students} tone="brand"
              value={stats.students.total} label="Total Students"
              sub={`${stats.students.active} active · ${stats.students.graduated} graduated`}
              onClick={can('students.view') ? () => navigate('/students') : undefined}
            />
            <StatCard
              icon={Icons.courses} tone="violet"
              value={stats.courses.active} label="Active Courses"
              sub={`${stats.courses.total} total in catalog`}
              onClick={can('courses.view') ? () => navigate('/courses') : undefined}
            />
            <StatCard
              icon={Icons.batches} tone="cyan"
              value={stats.batches.active} label="Active Batches"
              sub={`${stats.batches.total} total batches`}
              onClick={can('batches.view') ? () => navigate('/batches') : undefined}
            />
            <StatCard
              icon={Icons.admissions} tone="amber"
              value={stats.admissions.pending} label="Pending Admissions"
              sub={`${stats.admissions.approved} approved of ${stats.admissions.total}`}
              onClick={can('admissions.view') ? () => navigate('/admissions') : undefined}
            />
          </StatGrid>

          <StatGrid>
            <StatCard
              icon={Icons.fees} tone="green"
              value={money(stats.fees.collected)} label="Fees Collected"
              sub={`${stats.fees.transactions} transactions`}
              onClick={can('fees.manage') ? () => navigate('/fees') : undefined}
            />
            <StatCard
              icon={Icons.attendance} tone="green"
              value={money(stats.fees.collectedThisMonth)} label="Collected This Month"
              sub={`${stats.fees.collectionRate}% of expected`}
            />
            <StatCard
              icon={Icons.warning} tone="rose"
              value={money(stats.fees.due)} label="Outstanding Dues"
              sub={`of ${money(stats.fees.payable)} payable`}
            />
            <StatCard
              icon={Icons.enquiries} tone="brand"
              value={`${stats.enquiries.conversionRate}%`} label="Enquiry Conversion"
              sub={`${stats.enquiries.converted} of ${stats.enquiries.total} converted`}
              onClick={can('enquiries.view') ? () => navigate('/enquiries') : undefined}
            />
          </StatGrid>

          {/* --- Charts. Every series is live; an empty one says so rather than
                  drawing a flat line at zero. --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Enrollment trend" subtitle="New students admitted, last 12 months">
              <AreaChart
                data={charts?.enrollment || []}
                color="blue"
                emptyHint="Students you admit will appear here month by month."
              />
            </ChartCard>

            <ChartCard title="Fees collected" subtitle="What actually came in, month by month">
              <BarChart
                data={charts?.feesByMonth || []}
                format={compact}
                emptyHint="Payments taken at the fee desk are plotted here."
              />
            </ChartCard>

            <ChartCard title="Attendance" subtitle="Last 14 days — a hollow bar means the register was never taken">
              <AttendanceStrip
                data={charts?.attendanceTrend || []}
                emptyHint="Mark a register and the daily percentage appears here."
              />
            </ChartCard>

            <ChartCard title="Students by course" subtitle="Where your enrollment actually sits">
              <DonutChart
                data={charts?.byCourse || []}
                emptyHint="Add a course and enroll students to see the mix."
              />
            </ChartCard>

            {can('placements.view') && (
              <ChartCard title="Job readiness" subtitle="Active students, by employability state">
                <DonutChart
                  data={charts?.employability || []}
                  emptyHint="Readiness is derived from attendance, test scores and the trainer's sign-off."
                />
              </ChartCard>
            )}

            {can('fees.manage') && (
              <ChartCard title="How fees are paid" subtitle="Split by payment mode">
                <DonutChart
                  data={charts?.feeByMode || []}
                  format={compact}
                  emptyHint="Cash, UPI, card, bank or cheque — shown once payments come in."
                />
              </ChartCard>
            )}
          </div>

          {/* --- Critical AI additions: retention risk + escalated feedback --- */}
          {(risks.length > 0 || escalations.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {risks.length > 0 && (
                <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="erp-chip erp-chip-rose h-9 w-9">
                      <Icons.warning size={16} aria-hidden="true" />
                    </span>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      {t('Drop-out risk')} ({risks.length})
                    </h4>
                  </div>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {risks.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-gray-800 dark:text-slate-100 truncate">{r.name}</span>
                        <span className="text-[10px] text-rose-600 truncate">{r.risk_reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {escalations.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="erp-chip erp-chip-amber h-9 w-9">
                      <Icons.star size={16} aria-hidden="true" />
                    </span>
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      {t('Escalated feedback')} ({escalations.length})
                    </h4>
                  </div>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {escalations.map((e) => (
                      <li key={e.id} className="text-xs">
                        <span className="font-semibold text-gray-800 dark:text-slate-100">{e.trainer_name}</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-500"> — {e.escalation_reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-gray-400 mt-2">{t('Anonymous · hidden from the trainer.')}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Today's Attendance" icon={Icons.attendance} tone="green">
              {stats.attendanceToday.marked === 0 ? (
                <p className="text-xs text-gray-400">{t('No attendance marked today.')}</p>
              ) : (
                <>
                  <p className="erp-stat-value">{stats.attendanceToday.percentage}%</p>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-verdant-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.attendanceToday.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 mt-2 inline-block">
                    {stats.attendanceToday.present} present of {stats.attendanceToday.marked} marked
                  </span>
                </>
              )}
            </Panel>

            <Panel title="Upcoming Exams" icon={Icons.exams} tone="violet">
              <p className="erp-stat-value">{stats.exams.upcoming}</p>
              <span className="text-[11px] text-gray-400 mt-2 inline-block">
                {t('scheduled from today onward')}
              </span>
            </Panel>

            <Panel title="Recent Activity" icon={Icons.bell} tone="brand">
              {activity.length === 0 ? (
                <p className="text-xs text-gray-400">{t('No recent activity.')}</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                      {(() => {
                        const AIcon = activityIcon[a.kind] || Icons.bell;
                        return <AIcon size={14} className="shrink-0 text-gray-400" aria-hidden="true" />;
                      })()}
                      <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">{a.title}</span>
                      <span className="text-gray-400 truncate">{a.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
