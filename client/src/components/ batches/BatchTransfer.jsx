import React, { useState } from 'react';
import Button from '../common/Button';

const BatchTransfer = ({ selectedStudents = [], onTransferSuccess }) => {
  const [targetBatch, setTargetBatch] = useState('');

  const executeMigration = () => {
    if (!targetBatch) return alert('Define targeted migration node configuration.');
    alert(`Migrated ${selectedStudents.length} student references to cohort context [${targetBatch}]`);
    if (onTransferSuccess) onTransferSuccess(targetBatch);
  };

  return (
    <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
      <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">Selected Migration Cohort Scope Count: {selectedStudents.length} Profiles</p>
      <div className="flex gap-3 items-center">
        <select 
          className="text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-brand-500"
          value={targetBatch} 
          onChange={(e) => setTargetBatch(e.target.value)}
        >
          <option value="">Select Deployment Cohort Target...</option>
          <option value="Batch-2026-Alpha">Batch-2026-Alpha</option>
          <option value="Batch-2026-Omega">Batch-2026-Omega</option>
        </select>
        <Button variant="secondary" size="sm" onClick={executeMigration} disabled={selectedStudents.length === 0}>Deploy Migration Sequence</Button>
      </div>
    </div>
  );
};

export default BatchTransfer;