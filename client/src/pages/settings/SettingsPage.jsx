import React from 'react';
import SettingsDashboard from '../../components/settings/SettingsDashboard';
import { PageHero, Panel } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';

const SettingsPage = () => {
  return (
    <div className="space-y-5">
      <PageHero
        tone="slate"
        icon={Icons.settings}
        title="Institute Settings"
        subtitle="Configuration that every other module reads from."
      />

      <SettingsDashboard />

      <Panel title="Security" subtitle="Who can sign in, and how" icon={Icons.roles} tone="slate">
        <label className="flex items-center justify-between gap-4 text-xs cursor-pointer">
          <span className="text-gray-700 dark:text-slate-300">
            Require a strong passphrase and two-factor OTP at sign-in
          </span>
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
        </label>
      </Panel>
    </div>
  );
};

export default SettingsPage;
