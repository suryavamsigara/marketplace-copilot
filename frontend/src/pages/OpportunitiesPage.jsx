import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters, MARKETPLACES, CATEGORIES } from '../context/FilterContext';
import { api } from '../api/client';
import OpportunityCard from '../components/OpportunityCard';
import EmptyState from '../components/EmptyState';
import {
  Zap,
  Filter,
  Shield,
  Layers,
  Search,
  Sparkles,
  ArrowUpDown,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

const OPPORTUNITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'stock_out_risk', label: 'Stock-out Risk' },
  { value: 'conversion_decline', label: 'Conversion Decline' },
  { value: 'return_anomaly', label: 'Return Anomaly' },
  { value: 'marketplace_decline', label: 'Marketplace Decline' },
  { value: 'pricing_opportunity', label: 'Pricing Competitiveness' },
  { value: 'excess_inventory', label: 'Excess Inventory' },
  { value: 'sales_anomaly', label: 'Sales Anomaly' },
  { value: 'revenue_concentration', label: 'Revenue Concentration' },
  { value: 'underperforming_product', label: 'Underperforming SKU' },
];

export default function OpportunitiesPage() {
  const { marketplace, category, openExplain } = useFilters();

  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Fetch opportunities
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'opportunities-page',
      severityFilter,
      typeFilter,
      marketplace,
      category,
    ],
    queryFn: () =>
      api.getOpportunities({
        severity: severityFilter === 'All' ? undefined : severityFilter,
        opportunity_type: typeFilter || undefined,
        marketplace: marketplace || undefined,
        category: category || undefined,
      }),
  });

  const opportunities = data?.opportunities || [];

  // Filter by local search query if typed
  const filtered = opportunities.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.title?.toLowerCase().includes(s) ||
      o.entity?.toLowerCase().includes(s) ||
      o.recommendation?.toLowerCase().includes(s)
    );
  });

  // Calculate high-level urgency counts
  const criticalCount = opportunities.filter((o) => o.severity === 'Critical').length;
  const highCount = opportunities.filter((o) => o.severity === 'High').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Prioritization Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">Business Opportunities</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold font-mono">
              Score Prioritized (0–100)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized operational decisions and revenue risks ranked by Business Impact × Urgency × Confidence
          </p>
        </div>

        {/* Urgency Summary Pills */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>{criticalCount} Critical</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{highCount} High Priority</span>
          </div>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
        {/* Severity Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {SEVERITIES.map((s) => {
            const isActive = severityFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Type & Search Filters */}
        <div className="flex items-center space-x-3">
          {/* Type Selector */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by opportunity type"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-slate-900 text-slate-200">
                {t.label}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-48"
            />
          </div>
        </div>
      </div>

      {/* Opportunities Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-64 animate-pulse bg-slate-900/60" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Unable to load opportunities"
          description="Could not connect to the opportunity detection engine."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No opportunities match your filters"
          description="Try broadening the severity or opportunity type filters to see detected actions."
          onAction={() => {
            setSeverityFilter('All');
            setTypeFilter('');
            setSearch('');
          }}
          actionLabel="Clear Opportunity Filters"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
