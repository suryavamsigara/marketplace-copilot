import React from 'react';

export function KPISkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-3 w-20 bg-slate-800 rounded"></div>
        <div className="h-4 w-12 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-8 w-28 bg-slate-700/80 rounded"></div>
      <div className="h-3 w-36 bg-slate-800 rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="glass-card rounded-2xl p-4 animate-pulse space-y-3">
      <div className="h-6 w-48 bg-slate-800 rounded"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-900/60 rounded-xl flex items-center px-4 space-x-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-slate-800 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-5 w-40 bg-slate-800 rounded"></div>
        <div className="h-4 w-24 bg-slate-800 rounded"></div>
      </div>
      <div className="h-64 bg-slate-900/80 rounded-xl flex items-center justify-center">
        <div className="text-xs text-slate-400">Loading chart analytics...</div>
      </div>
    </div>
  );
}
