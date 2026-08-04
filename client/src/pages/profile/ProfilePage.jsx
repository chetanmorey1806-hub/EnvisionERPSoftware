import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ProfilePage = () => {
  const { user } = useContext(AuthContext);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-black">Operator Profile Context</h1>
      <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white uppercase">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block uppercase">Identity Handle Designation</label>
          <span className="text-base font-medium">{user?.name || 'Administrative Agent'}</span>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block uppercase">Routing Security Scope Role</label>
          <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 p-1 rounded capitalize">{user?.role || 'System Operator'}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;