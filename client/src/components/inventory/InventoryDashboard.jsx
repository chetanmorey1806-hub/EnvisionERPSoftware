import React from 'react';

const InventoryDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 text-xs mb-6 flex justify-between items-center">
    <div><span className="text-gray-400 block">Critical Procurement Outages</span><b className="text-rose-600">2 Low-Stock Warnings</b></div>
    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold">Audit Required</span>
  </div>
);

export default InventoryDashboard;