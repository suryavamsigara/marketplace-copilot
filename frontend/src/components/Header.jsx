import React from 'react';
import { useLocation } from 'react-router-dom';
import { useFilters, DATE_RANGES, MARKETPLACES, CATEGORIES } from '../context/FilterContext';
import { Calendar, Filter, RefreshCw, Layers } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const {
    days,
    setDays,
    marketplace,
    setMarketplace,
    category,
    setCategory,
    resetFilters,
  } = useFilters();

  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/' || path === '/overview') {
      return {
        title: 'Executive Overview',
        subtitle: 'Understand what changed, why it changed, and what to do next.',
        showLiveBadge: true,
      };
    }
    if (path.startsWith('/marketplaces')) {
      return {
        title: 'Marketplace Intelligence',
        subtitle: 'Channel benchmarking across Amazon, Flipkart, Myntra, and Ajio.',
        showLiveBadge: false,
      };
    }
    if (path.startsWith('/products')) {
      return {
        title: 'Product Intelligence',
        subtitle: 'Granular SKU analytics, inventory coverage, and revenue exposure.',
        showLiveBadge: false,
      };
    }
    if (path.startsWith('/opportunities')) {
      return {
        title: 'Business Opportunities',
        subtitle: 'Prioritized issues and opportunities requiring immediate operational attention.',
        showLiveBadge: false,
      };
    }
    if (path.startsWith('/copilot')) {
      return {
        title: 'AI Copilot Reasoning Layer',
        subtitle: 'Natural-language inquiries backed by deterministic tools & verified data.',
        showLiveBadge: false,
      };
    }
    return {
      title: 'Marketplace Performance Copilot',
      subtitle: 'Operations intelligence & AI decision support.',
      showLiveBadge: false,
    };
  };

  const meta = getPageMeta();
  const hasActiveFilters = marketplace || category || days !== 30;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between transition-all">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <span>{meta.title}</span>
          {meta.showLiveBadge && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
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
      </div>
    </header>
  );
}
