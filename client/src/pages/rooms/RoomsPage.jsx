import React, { useEffect, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import SearchFilter from '../../components/common/SearchFilter';
import { Icons } from '../../components/common/icons';
import { roomApi } from '../../api/courseApi';
import { usePermissions } from '../../hooks/usePermissions';

const EMPTY = { code: '', name: '', type: 'classroom', capacity: '', location: '' };

const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const RoomsPage = () => {
  const { can } = usePermissions();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    roomApi.getAll()
      .then((r) => setRooms(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load rooms.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await roomApi.create({ ...form, capacity: Number(form.capacity) || 0 });
      setForm(null); load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to save the room.'); }
    finally { setSaving(false); }
  };

  const columns = [
    {
      header: 'Room',
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{r.name}</p>
          <p className="text-[11px] text-gray-400 font-mono">{r.code}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          r.type === 'lab'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'}`}>
          {r.type}
        </span>
      ),
    },
    { header: 'Seats', cell: (r) => <span className="font-semibold">{r.capacity}</span> },
    { header: 'Location', cell: (r) => r.location || <span className="text-gray-300">—</span> },
    {
      header: 'In use',
      cell: (r) => (
        <span className="text-[11px]">
          {r.active_batches > 0
            ? <span className="text-emerald-600 font-semibold">{r.active_batches} active batch(es)</span>
            : <span className="text-gray-400">Free</span>}
        </span>
      ),
    },
  ];

  const visible = rooms.filter((r) =>
    (!search || `${r.name} ${r.code} ${r.location || ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!type || r.type === type));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Master' }, { label: 'Classrooms & Labs' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Classrooms &amp; Labs</h1>
          <p className="text-xs text-gray-500">Physical rooms a batch can be scheduled into — seating capacity is enforced.</p>
        </div>
        {can('classrooms.create') && (
          <button onClick={() => { setForm({ ...EMPTY }); setError(''); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm press">
            <Icons.plus size={15} /> Add Room
          </button>
        )}
      </div>

      {error && !form && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      <SearchFilter
        value={search} onSearch={setSearch} placeholder="Search room name, code or location…"
        resultCount={visible.length}
        chips={{ value: type, onChange: setType, options: [{ value: 'classroom', label: 'Classroom' }, { value: 'lab', label: 'Lab' }] }}
        onClear={() => { setSearch(''); setType(''); }}
      />

      <DataTable columns={columns} data={visible} isLoading={loading}
        emptyMessage="No rooms yet. Add a classroom or lab so batches can be scheduled into it." />

      {form && (
        <Modal isOpen title="Add classroom / lab" onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={save} disabled={saving || !form.code || !form.name}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Add room'}
            </button>
          </>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {error && <div className="sm:col-span-2 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
            <Field label="Room code" required>
              <input className={inputCls} placeholder="LAB-B" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Room name" required>
              <input className={inputCls} placeholder="Computer Lab B" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Type">
              <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="classroom">Classroom</option>
                <option value="lab">Computer Lab</option>
              </select>
            </Field>
            <Field label="Seating capacity">
              <input type="number" min="0" className={inputCls} placeholder="30" value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location">
                <input className={inputCls} placeholder="2nd floor, east wing" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RoomsPage;
