import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

export default function KPICard({
  id,
  title,
  value,
  previousValue,
  changePct,
  format = 'number', // 'currency' | 'number' | 'percent'
  inverseSentiment = false, // true for metrics where an increase is bad (e.g. return_rate)
  subtitle,
}) {
  const { openExplain } = useFilters();

  const isPositive = changePct > 0;
  const isNeutral = changePct === 0 || changePct === null || isNaN(changePct);

  // Determine good vs bad based on inverse sentiment
  const isGood = inverseSentiment ? !isPositive : isPositive;

  const handleExplain = (e) => {
    e.stopPropagation();
    openExplain(
      'kpi',
      id,
      `AI Root-Cause: ${title}`,
      `Evaluating drivers for ${changePct > 0 ? '+' : ''}${changePct || 0}% shift against prior period`
    );
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={handleExplain}
          className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/30 text-[11px] font-medium transition-all"
          title={`Click to explain ${title} with AI reasoning`}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Explain</span>
        </button>
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline space-x-2 mb-3">
        <span className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
          {value}
        </span>
      </div>

      {/* Comparison Badge & Previous Value */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex items-center space-x-1.5">
          {!isNeutral && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-[11px] ${
                isGood
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3 mr-0.5 inline" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5 inline" />
              )}
              {isPositive ? '+' : ''}
              {Number(changePct || 0).toFixed(1)}%
            </span>
          )}
          {isNeutral && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-medium text-[11px] bg-slate-800 text-slate-400">
              <Minus className="w-3 h-3 mr-0.5 inline" /> 0.0%
            </span>
          )}
          <span className="text-[11px] text-slate-400">vs prev period</span>
        </div>

        {previousValue !== undefined && (
          <span className="text-[11px] text-slate-400 font-mono">
            {previousValue}
          </span>
        )}
      </div>

      {subtitle && <p className="text-[11px] text-slate-400 mt-2">{subtitle}</p>}
    </div>
  );
}
