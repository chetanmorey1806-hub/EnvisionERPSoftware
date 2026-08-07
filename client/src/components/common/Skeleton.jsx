import React from 'react';

/**
 * Shimmer placeholder. Match the shape of the real content so the layout
 * doesn't shift when data arrives (CLS ≈ 0).
 *
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonCard />
 */
export const Skeleton = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800 ${className}`}>
    <div className="absolute inset-0 animate-shimmer" />
  </div>
);

export const SkeletonCard = () => (
  <div className="erp-card p-5">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-20 mt-2" />
    <Skeleton className="h-2.5 w-32 mt-2" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 py-3">
    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-2.5 w-1/4" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
);

export default Skeleton;
