import React from 'react';

const ReportsDashboard = () => {
  // Telemetry metrics tracking background data-compiler operations
  const metrics = [
    {
      label: 'Compiled System Datasets',
      value: '1,420',
      detail: 'Across Financial & Academic Blocks',
      status: 'Archives Synchronized',
      icon: '📊'
    },
    {
      label: 'Avg Processing Runtime',
      value: '342 ms',
      detail: 'Optimized PostgreSQL execution paths',
      status: 'Latency Optimal',
      icon: '⚡'
    },
    {
      label: 'Export Pipelines Active',
      value: '2',
      detail: 'CSV / JSON streaming formats active',
      status: 'Streaming Normal',
      icon: '🔄'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((item, index) => (
        <div 
          key={index} 
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-xl p-5 shadow-xs flex items-center justify-between transition-all hover:border-gray-200 dark:hover:border-slate-700"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">
              {item.label}
            </span>
            <div className="text-2xl font-black text-gray-800 dark:text-slate-100 tracking-tight">
              {item.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              {item.detail}
            </div>
            <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 block pt-0.5">
              ● {item.status}
            </span>
          </div>
          
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 flex items-center justify-center text-xl select-none shadow-inner">
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportsDashboard;