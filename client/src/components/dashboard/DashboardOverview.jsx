import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '../common/icons';

/** The four areas most people jump to from the dashboard. */
const SEGMENTS = [
  { title: 'Students', desc: 'Active profiles, retention and outflow', link: '/students', icon: Icons.students, tone: 'brand' },
  { title: 'Admissions', desc: 'Verification pipeline and document audits', link: '/admissions', icon: Icons.admissions, tone: 'green' },
  { title: 'Fees & Revenue', desc: 'Invoices, collections and outstanding dues', link: '/fees', icon: Icons.fees, tone: 'amber' },
  { title: 'Courses', desc: 'Catalogue, syllabus and capacity', link: '/courses', icon: Icons.courses, tone: 'violet' },
];

const DashboardOverview = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {SEGMENTS.map((s) => (
      <Link
        key={s.link}
        to={s.link}
        className="erp-card erp-card-interactive p-5 flex items-center gap-4 group"
      >
        <span className={`erp-chip erp-chip-${s.tone}`}>
          <s.icon size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.title}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
        </div>
        <Icons.chevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-gray-300 dark:text-slate-600 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    ))}
  </div>
);

export default DashboardOverview;
