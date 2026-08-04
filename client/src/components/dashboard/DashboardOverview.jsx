import React from 'react';
import { Link } from 'react-router-dom';

const DashboardOverview = () => {
  const dynamicNodes = [
    { title: 'Core Student Lifecycle', desc: 'Active Profiles, Retention Curves & Outflows', link: '/students', color: 'border-blue-500' },
    { title: 'Admissions & Funnels', desc: 'Verification Pipeline, Document Audits & Queue Logs', link: '/admissions', color: 'border-emerald-500' },
    { title: 'Treasury & Revenue Accounts', desc: 'Invoices Issued, Collected Balances & Outstanding Dues', link: '/fees', color: 'border-amber-500' },
    { title: 'Academic Course Matrix', desc: 'Program Catalogs, Syllabus Pipelines & Capacities', link: '/courses', color: 'border-indigo-500' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">Cluster Health Metric: Optimal</h2>
          <p className="text-xs text-slate-400 mt-0.5">All secondary functional modules are currently reporting healthy execution cycles.</p>
        </div>
        <div className="flex gap-2 text-xs font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-emerald-400">● Core DB: Online</span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400">Broker: Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dynamicNodes.map((node, i) => (
          <div key={i} className={`p-5 bg-white dark:bg-slate-900 border-l-4 ${node.color} rounded-xl border border-y-gray-100 border-r-gray-100 dark:border-y-slate-800/40 dark:border-r-slate-800/40 shadow-xs flex flex-col justify-between`}>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">{node.title}</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">{node.desc}</p>
            </div>
            <div className="pt-4 flex justify-end">
              <Link to={node.link} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                Access System Segment ➔
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;