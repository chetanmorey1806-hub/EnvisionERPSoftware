import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumb = ({ items = [] }) => {
  return (
    <nav className="flex items-center space-x-2 text-xs font-medium text-gray-400 dark:text-slate-500">
      <Link 
        to="/dashboard" 
        className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1"
      >
        <span>🖥️</span> Workspace
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span>/</span>
          {item.path ? (
            <Link 
              to={item.path} 
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 dark:text-slate-300 font-semibold">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;