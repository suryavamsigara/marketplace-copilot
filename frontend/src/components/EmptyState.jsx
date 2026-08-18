import React from 'react';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your filters or date range to see marketplace data.',
  icon: Icon = Layers,
  actionLabel = 'Reset Filters',
  onAction,
}) {
  const { resetFilters } = useFilters();

  return (
    <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-amber-400">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-100">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      <button
        onClick={onAction || resetFilters}
        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
      >
        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
