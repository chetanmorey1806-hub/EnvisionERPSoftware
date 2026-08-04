import React from 'react';
import SettingsDashboard from '../../components/settings/SettingsDashboard';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Node Cluster Environment Properties</h1>
      <SettingsDashboard />
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold">Security Context Directives</h3>
        <div className="flex items-center justify-between text-xs">
          <span>Enforce Enforce Strong Passkey Sequences (Dual Factor OTP)</span>
          <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;