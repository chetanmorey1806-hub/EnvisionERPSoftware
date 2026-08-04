import React from 'react';

const SettingsDashboard = () => (
  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-mono text-slate-500 mb-6">
    <p>Database Connector Status: <b>CONNECTED</b></p>
    <p>Active Session Cache TTL: <b>3600000ms (1 Hour)</b></p>
  </div>
);

export default SettingsDashboard;