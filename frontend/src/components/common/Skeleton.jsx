import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const variantStyles = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`animate-pulse bg-paper-200/70 ${variantStyles[variant] || ''} ${className}`}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full space-y-3 p-4">
      <Skeleton className="h-10 w-full mb-4" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
