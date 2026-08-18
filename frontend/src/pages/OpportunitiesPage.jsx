import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import OpportunityCard from '../components/OpportunityCard';
import EmptyState from '../components/EmptyState';
import {
  Zap,
  Search,
  Flame,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

const OPPORTUNITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'stock_out_risk', label: 'Stock-out Risk' },
  { value: 'conversion_decline', label: 'Conversion Decline' },
  { value: 'return_rate_anomaly', label: 'Return Anomaly' },
  { value: 'marketplace_decline', label: 'Marketplace Decline' },
  { value: 'pricing_competitiveness', label: 'Pricing Competitiveness' },
  { value: 'excess_inventory', label: 'Excess Inventory' },
  { value: 'sales_anomaly', label: 'Sales Anomaly' },
  { value: 'revenue_concentration_risk', label: 'Revenue Concentration' },
  { value: 'underperforming_product', label: 'Underperforming SKU' },
  { value: 'high_traffic_low_orders', label: 'High Traffic Weak Conv' },
];

export default function OpportunitiesPage() {
  const { marketplace, category } = useFilters();

  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [severityFilter, typeFilter, marketplace, category]);

  // Fetch opportunities with server-side pagination
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
      page,
      pageSize,
    ],
    queryFn: () =>
      api.getOpportunities({
        severity: severityFilter === 'All' ? undefined : severityFilter,
        opportunity_type: typeFilter || undefined,
        marketplace: marketplace || undefined,
        category: category || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const opportunities = data?.opportunities || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || Math.ceil(total / pageSize) || 1;

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

        {/* Status Count Pill */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 font-semibold font-mono">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{total} Total Opportunities</span>
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
          {Array.from({ length: pageSize }).map((_, i) => (
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>

          {/* Pagination Bar */}
          {total > pageSize && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400 mt-6">
              <div>
                Showing <span className="font-semibold text-slate-200">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-slate-200">
                  {Math.min(page * pageSize, total)}
                </span>{' '}
                of <span className="font-semibold text-slate-200">{total}</span> opportunities
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(p - 1, 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <span className="px-3 font-mono font-medium text-slate-300 bg-slate-900 py-1.5 rounded-lg border border-slate-800">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(p + 1, totalPages));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
