import React from 'react';
import Button from './Button';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-xs">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button variant="outline" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Previous</Button>
        <Button variant="outline" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700 dark:text-slate-300">
          Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
        </p>
        <div className="inline-flex space-x-1">
          <Button variant="outline" className="px-2 py-1 text-xs" disabled={currentPage === 1} onClick={() => onPageChange(1)}>&laquo;</Button>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</Button>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
          <Button variant="outline" className="px-2 py-1 text-xs" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>&raquo;</Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;