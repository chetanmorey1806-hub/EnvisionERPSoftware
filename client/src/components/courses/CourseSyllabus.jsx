import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

const CourseSyllabus = ({ courseId }) => {
  const [modules, setModules] = useState(['Module 1: Foundational Paradigm Structures']);
  const [newModule, setNewModule] = useState('');

  const addModule = (e) => {
    e.preventDefault();
    if (!newModule.trim()) return;
    setModules([...modules, newModule]);
    setNewModule('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Curriculum Syllabus Index mapping ({courseId})</h3>
      <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
        {modules.map((m, idx) => (
          <li key={idx} className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span>{m}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={addModule} className="flex gap-2">
        <Input placeholder="Append curriculum block..." value={newModule} onChange={(e) => setNewModule(e.target.value)} className="mb-0!" />
        <Button type="submit" variant="primary" size="sm" className="whitespace-nowrap">Append Block</Button>
      </form>
    </div>
  );
};

export default CourseSyllabus;