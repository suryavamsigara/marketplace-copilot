import React from 'react';
import { useFilters, DATE_RANGES, MARKETPLACES, CATEGORIES } from '../context/FilterContext';
import { Calendar, Filter, Sparkles, RefreshCw, Layers } from 'lucide-react';

export default function Header() {
  const {
    activeTab,
    days,
    setDays,
    marketplace,
    setMarketplace,
    category,
    setCategory,
    openExplain,
    resetFilters,
  } = useFilters();

  const getPageMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Executive Overview',
          subtitle: 'Understand what changed, why it changed, and what to do next.',
        };
      case 'marketplaces':
        return {
          title: 'Marketplace Intelligence',
          subtitle: 'Channel benchmarking across Amazon, Flipkart, Myntra, and Ajio.',
        };
      case 'products':
        return {
          title: 'Product Intelligence',
          subtitle: 'Granular SKU analytics, inventory coverage, and revenue exposure.',
        };
      case 'opportunities':
        return {
          title: 'Business Opportunities',
          subtitle: 'Prioritized issues and opportunities requiring immediate operational attention.',
        };
      case 'copilot':
        return {
          title: 'AI Copilot Reasoning Layer',
          subtitle: 'Natural-language queries backed by deterministic Python tools & verified data.',
        };
      default:
        return {
          title: 'Marketplace Performance Copilot',
          subtitle: 'Operations intelligence & AI decision support.',
        };
    }
  };

  const meta = getPageMeta();
  const hasActiveFilters = marketplace || category || days !== 30;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between transition-all">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <span>{meta.title}</span>
          {activeTab === 'overview' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Live Operations
            </span>
          )}
        </h2>
        <p className="text-xs text-slate-400 font-normal">{meta.subtitle}</p>
      </div>

      {/* Global Filter Bar Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Date Range Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Filter by date range"
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2 font-medium"
          >
            {DATE_RANGES.map((d) => (
              <option key={d.value} value={d.value} className="bg-slate-900 text-slate-200">
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Marketplace Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
          <Filter className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            aria-label="Filter by marketplace"
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2 font-medium"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Marketplaces
            </option>
            {MARKETPLACES.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-slate-200">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
          <Layers className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2 font-medium"
          >
            <option value="" className="bg-slate-900 text-slate-200">
              All Categories
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-slate-200">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button if active */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            title="Reset Filters"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Explain Button */}
        <button
          onClick={() =>
            openExplain(
              'kpi',
              'revenue',
              'AI Period Analysis: What Changed?',
              'Deep dive into current period revenue drivers, market shifts, and priority actions'
            )
          }
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explain Period</span>
        </button>
      </div>
    </header>
  );
}
