import React from 'react';

const FacultyAssignment = ({ facultyId }) => {
  const currentLoads = [
    { courseCode: 'CS-101', workload: '4 Hours/Week', room: 'Lab Node 2' },
    { courseCode: 'CS-409', workload: '3 Hours/Week', room: 'Theater Block A' }
  ];

  return (
    <div className="space-y-3">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Operational Distribution Array ({facultyId})</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {currentLoads.map((load, index) => (
          <div key={index} className="p-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-xs">
            <div className="font-bold text-gray-800 dark:text-slate-200 mb-1">{load.courseCode}</div>
            <div className="text-gray-500">{load.workload} | {load.room}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacultyAssignment;