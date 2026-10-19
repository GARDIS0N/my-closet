import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E2D8] overflow-hidden shadow-xs space-y-3 p-3">
      <div className="w-full aspect-square rounded-2xl skeleton-shimmer" />
      <div className="space-y-2 p-1">
        <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
        <div className="h-3 w-1/2 rounded-md skeleton-shimmer" />
      </div>
    </div>
  );
};
