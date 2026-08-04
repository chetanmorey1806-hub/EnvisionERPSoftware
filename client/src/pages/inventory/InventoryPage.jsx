import React, { useState } from 'react';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { PageHeader, Empty, Flash, Table, Btn, useList, Loading } from '../../components/common/PageKit';
import { inventoryApi } from '../../api/inventoryApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Lab hardware and consumables. A stock movement is always in or out. */
const InventoryPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const L = useList(inventoryApi.getItems);
  const [form, setForm] = useState(null);
  const [stock, setStock] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await inventoryApi.createItem({ ...form, quantity: Number(form.quantity || 0), reorder_level: Number(form.reorder_level || 0) });
      L.flash(t('Item added.'));
      setForm(null);
      L.load();
    } catch (e) { L.fail(e); } finally { setBusy(false); }
  };

  const move = async () => {
    setBusy(true);
    try {
      await inventoryApi.updateStock(stock.id, { type: stock.type, quantity: Number(stock.quantity), note: stock.note || null });
      L.flash(t('Stock updated.'));
      setStock(null);
      L.load();
    } catch (e) { L.fail(e); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader crumbs={['Resources', 'Inventory']} icon={<Icons.inventory size={18} />} title="Inventory"
        subtitle="Lab hardware, licences and consumables. Anything at or below its reorder level is flagged."
        action={can('inventory.create') && (
          <button onClick={() => setForm({ name: '', sku: '', category: '', quantity: 0, unit: 'unit', reorder_level: 0 })}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900">
            + {t('Add item')}
          </button>
        )} />
      <Flash error={L.error} notice={L.notice} />

      {L.loading ? <Loading /> : L.items.length === 0 ? (
        <Empty title="Nothing in inventory" hint="Add the first item — a lab PC, a projector, a software licence." />
      ) : (
        <Table headers={['Item', 'SKU', 'Category', 'In stock', 'Reorder at', '']}>
          {L.items.map((i) => {
            const low = Number(i.quantity) <= Number(i.reorder_level);
            return (
              <tr key={i.id} className="bg-white dark:bg-slate-900">
                <td className="px-3 py-2 font-bold text-gray-900 dark:text-slate-100">{i.name}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{i.sku || '—'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{i.category || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${low ? 'text-rose-600' : 'text-gray-900 dark:text-slate-100'}`}>
                    {i.quantity} {i.unit}
                  </span>
                  {low && <span className="ml-1 text-[10px] font-bold text-rose-600 uppercase">{t('low')}</span>}
                </td>
                <td className="px-3 py-2 text-gray-500">{i.reorder_level}</td>
                <td className="px-3 py-2 text-right">
                  {can('inventory.update') && (
                    <Btn onClick={() => setStock({ id: i.id, name: i.name, type: 'in', quantity: 1, note: '' })}>
                      {t('Stock in/out')}
                    </Btn>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {form && (
        <Modal isOpen size="md" title={t('Add item')} onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={save} disabled={busy || !form.name}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50">
              {busy ? t('Saving…') : t('Save')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item name" required className="col-span-2">
              <input className={inputClsCompact} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU"><input className={inputClsCompact} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
            <Field label="Category"><input className={inputClsCompact} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Quantity"><input type="number" className={inputClsCompact} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Reorder level" hint="Flagged as low at or below this."><input type="number" className={inputClsCompact} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {stock && (
        <Modal isOpen size="sm" title={`${t('Stock in/out')} — ${stock.name}`} onClose={() => setStock(null)}
          footer={<>
            <button onClick={() => setStock(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={move} disabled={busy || !(Number(stock.quantity) > 0)}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50">
              {busy ? t('Saving…') : t('Save')}
            </button>
          </>}>
          <div className="space-y-3">
            <Field label="Movement" required>
              <select className={inputClsCompact} value={stock.type} onChange={(e) => setStock({ ...stock, type: e.target.value })}>
                <option value="in">{t('Stock in')}</option>
                <option value="out">{t('Stock out')}</option>
              </select>
            </Field>
            <Field label="Quantity" required>
              <input type="number" min="1" className={inputClsCompact} value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
            </Field>
            <Field label="Note"><input className={inputClsCompact} value={stock.note} onChange={(e) => setStock({ ...stock, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryPage;
