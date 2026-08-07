import React from 'react';
import Button from './Button';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="erp-card flex items-center justify-between px-4 py-3 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button variant="outline" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Previous</Button>
        <Button variant="outline" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
          Page <span className="font-bold text-gray-800 dark:text-slate-100">{currentPage}</span> of <span className="font-bold text-gray-800 dark:text-slate-100">{totalPages}</span>
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