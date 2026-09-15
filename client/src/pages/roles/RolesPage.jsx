import React, { useEffect, useState } from 'react';
import { PageHero } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { roleApi } from '../../api/roleApi';
import { usePermissions } from '../../hooks/usePermissions';

const RolesPage = () => {
  const { can } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [selected, setSelected] = useState(null);
  const [granted, setGranted] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([roleApi.getAll(), roleApi.getPermissions()])
      .then(([r, p]) => {
        setRoles(r.data.data || []);
        setGrouped(p.data.data.grouped || {});
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load roles.'))
      .finally(() => setLoading(false));
  }, []);

  const openRole = async (role) => {
    const res = await roleApi.getById(role.id);
    setSelected(res.data.data);
    setGranted(new Set(res.data.data.permissions || []));
  };

  const toggle = (name) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await roleApi.setPermissions(selected.id, [...granted]);
      const refreshed = await roleApi.getAll();
      setRoles(refreshed.data.data || []);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        tone="slate"
        icon={Icons.roles}
        title="Roles & Permissions"
        subtitle="Access control is data-driven — grants live in the database and take effect immediately."
      />

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-gray-400">Loading roles…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="erp-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-slate-100">{r.label}</h3>
                  <code className="text-[10px] text-gray-400">{r.name}</code>
                </div>
                {r.is_system === 1 && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    system
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 min-h-8">{r.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="text-gray-600 dark:text-slate-400">
                  <b className="text-brand-600">{r.permission_count}</b> permissions
                </span>
                <span className="text-gray-600 dark:text-slate-400">
                  <b className="text-emerald-600">{r.user_count}</b> users
                </span>
              </div>
              {can('roles.update') && (
                <button
                  onClick={() => openRole(r)}
                  className="mt-4 w-full text-xs font-semibold py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Manage permissions
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Permission editor */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-slate-800 animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 dark:text-slate-100">{selected.label}</h2>
                <p className="text-[11px] text-gray-400">{granted.size} permissions granted</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                &times;
              </button>
            </div>

            <div className="overflow-y-auto space-y-5">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{module}</h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((p) => {
                      const on = granted.has(p.name);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggle(p.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            on
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-gray-50 dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:border-brand-400'
                          }`}
                        >
                          {p.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white disabled:opacity-60">
                {saving ? 'Saving…' : 'Save permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
