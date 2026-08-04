import React, { useEffect, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { dashboardApi } from '../../api/dashboardApi';
import { useSocket } from '../../context/SocketContext';
import { Icons } from '../../components/common/icons';
import { adminApi } from '../../api/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';
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

const StatCard = ({ label, value, sub, accent = 'text-gray-800 dark:text-slate-100', icon: Icon }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h4>
      {Icon && <Icon size={16} strokeWidth={2} className="text-gray-300 dark:text-slate-600" aria-hidden="true" />}
    </div>
    <p className={`text-2xl font-black mt-1 ${accent}`}>{value}</p>
    {sub && <span className="text-[11px] text-gray-400 font-medium">{sub}</span>}
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800">
    <div className="h-3 w-24 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
    <div className="h-7 w-20 bg-gray-100 dark:bg-slate-800 rounded mt-2 animate-pulse" />
  </div>
);

const activityIcon = { student: Icons.students, fee: Icons.fees, enquiry: Icons.enquiries };

const Dashboard = () => {
  const { socket } = useSocket();
  const { can } = usePermissions();
  const { t } = useT();
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
    <div className="space-y-6">
      <Breadcrumb items={[]} />
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-slate-50">{t('Command Center')}</h1>
        <p className="text-sm text-gray-500">{t('Live metrics across the institute — updates in real time.')}</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Icons.students} label="Total Students" value={stats.students.total}
              sub={`${stats.students.active} active · ${stats.students.graduated} graduated`} />
            <StatCard icon={Icons.courses} label="Active Courses" value={stats.courses.active}
              sub={`${stats.courses.total} total in catalog`} />
            <StatCard icon={Icons.batches} label="Active Batches" value={stats.batches.active}
              sub={`${stats.batches.total} total batches`} />
            <StatCard icon={Icons.admissions} label="Pending Admissions" value={stats.admissions.pending}
              accent="text-amber-500"
              sub={`${stats.admissions.approved} approved of ${stats.admissions.total}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Icons.fees} label="Fees Collected" value={money(stats.fees.collected)}
              accent="text-emerald-500"
              sub={`${stats.fees.transactions} transactions`} />
            <StatCard icon={Icons.attendance} label="Collected This Month" value={money(stats.fees.collectedThisMonth)}
              accent="text-emerald-500" sub={`${stats.fees.collectionRate}% of expected`} />
            <StatCard icon={Icons.warning} label="Outstanding Dues" value={money(stats.fees.due)}
              accent="text-rose-500" sub={`of ${money(stats.fees.payable)} payable`} />
            <StatCard icon={Icons.enquiries} label="Enquiry Conversion" value={`${stats.enquiries.conversionRate}%`}
              sub={`${stats.enquiries.converted} of ${stats.enquiries.total} converted`} />
          </div>

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
                <div className="p-5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900">
                  <div className="flex items-center gap-2 mb-3">
                    <Icons.warning size={16} className="text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Drop-out risk ({risks.length})
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
                <div className="p-5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-3">
                    <Icons.star size={16} className="text-amber-600" />
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Escalated feedback ({escalations.length})
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
                  <p className="text-[10px] text-gray-400 mt-2">Anonymous · hidden from the trainer.</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Attendance</h4>
              {stats.attendanceToday.marked === 0 ? (
                <p className="text-xs text-gray-400">No attendance marked today.</p>
              ) : (
                <>
                  <p className="text-2xl font-black text-gray-800 dark:text-slate-100">
                    {stats.attendanceToday.percentage}%
                  </p>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.attendanceToday.percentage}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {stats.attendanceToday.present} present of {stats.attendanceToday.marked} marked
                  </span>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Upcoming Exams</h4>
              <p className="text-2xl font-black text-gray-800 dark:text-slate-100">{stats.exams.upcoming}</p>
              <span className="text-[11px] text-gray-400">scheduled from today onward</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h4>
              {activity.length === 0 ? (
                <p className="text-xs text-gray-400">No recent activity.</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                      {(() => { const AIcon = activityIcon[a.kind] || Icons.bell;
                        return <AIcon size={14} className="shrink-0 text-gray-400" aria-hidden="true" />; })()}
                      <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">{a.title}</span>
                      <span className="text-gray-400 truncate">{a.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
