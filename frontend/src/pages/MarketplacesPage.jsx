import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import HealthBadge from '../components/HealthBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  Store,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function MarketplacesPage() {
  const navigate = useNavigate();
  const { days, openExplain } = useFilters();

  const [activeMktName, setActiveMktName] = useState('Amazon');

  // Fetch all marketplaces summary
  const {
    data: allMktsData,
    isLoading: isAllLoading,
    isError: isAllError,
  } = useQuery({
    queryKey: ['marketplaces-list', days],
    queryFn: () => api.getMarketplaces({ days }),
  });

  // Fetch detailed drilldown for active marketplace
  const {
    data: mktDetailData,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ['marketplace-detail', activeMktName, days],
    queryFn: () => api.getMarketplaceDetail(activeMktName, { days }),
    enabled: Boolean(activeMktName),
  });

  if (isAllError) {
    return (
      <EmptyState
        title="Unable to load marketplace benchmarking"
        description="Could not connect to marketplace intelligence service."
      />
    );
  }

  const marketplaces = allMktsData?.marketplaces || [];
  const currentDetail = mktDetailData?.marketplace;
  const revenueTrend = mktDetailData?.revenue_trend || [];
  const topProducts = mktDetailData?.top_products || [];
  const worstProducts = mktDetailData?.worst_products || [];

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto">
      {/* 1. BENCHMARKING TABLE */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Marketplace Benchmarking & Channel Health</span>
            </h3>
            <p className="text-xs text-slate-400">
              Comparative analysis across active selling channels over the last {days} days
            </p>
          </div>
        </div>

        {isAllLoading ? (
          <TableSkeleton rows={4} cols={8} />
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Marketplace</th>
                    <th className="px-4 py-3.5">Revenue</th>
                    <th className="px-4 py-3.5">Growth (WoW)</th>
                    <th className="px-4 py-3.5">Orders</th>
                    <th className="px-4 py-3.5">Units Sold</th>
                    <th className="px-4 py-3.5">Conversion</th>
                    <th className="px-4 py-3.5">AOV</th>
                    <th className="px-4 py-3.5">Return Rate</th>
                    <th className="px-4 py-3.5">Stockout Risks</th>
                    <th className="px-4 py-3.5">Revenue Share</th>
                    <th className="px-5 py-3.5">Health</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {marketplaces.map((m) => {
                    const isSelected = activeMktName === m.marketplace;
                    const isGrowthPositive = m.revenue_growth_pct > 0;
                    return (
                      <tr
                        key={m.marketplace}
                        onClick={() => setActiveMktName(m.marketplace)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : 'hover:bg-slate-900/80'
                        }`}
                      >
                        <td className="px-5 py-4 font-bold text-slate-100 flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-amber-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="text-sm">{m.marketplace}</span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-100">
                          {formatCurrency(m.revenue)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center font-bold ${
                              isGrowthPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isGrowthPositive ? (
                              <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                            )}
                            {formatPercent(m.revenue_growth_pct)}
                          </span>
                        </td>
                        <td className="px-4 py-4">{formatNumber(m.orders)}</td>
                        <td className="px-4 py-4">{formatNumber(m.units_sold)}</td>
                        <td className="px-4 py-4 font-mono">{m.conversion_rate}%</td>
                        <td className="px-4 py-4">{formatCurrency(m.avg_order_value)}</td>
                        <td className="px-4 py-4 font-mono">{m.return_rate}%</td>
                        <td className="px-4 py-4">
                          {m.stockout_risk_products > 0 ? (
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {m.stockout_risk_products} SKUs
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-semibold text-amber-300">
                          {m.revenue_contribution_pct}%
                        </td>
                        <td className="px-5 py-4">
                          <HealthBadge health={m.health} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMktName(m.marketplace);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Drilldown'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. DEDICATED MARKETPLACE DRILLDOWN VIEW */}
      {activeMktName && (
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          {/* Drilldown Header & Quick Explain */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Channel Deep Dive
                </span>
                <span className="text-xs text-slate-400">•</span>
                <h3 className="text-lg font-bold text-slate-100">{activeMktName} Intelligence</h3>
                {currentDetail?.health && <HealthBadge health={currentDetail.health} />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Channel-specific sales momentum, listing performance, and product risks
              </p>
            </div>

            <button
              onClick={() =>
                openExplain(
                  'kpi',
                  `marketplace_${activeMktName.toLowerCase()}`,
                  `AI Channel Diagnosis: ${activeMktName}`,
                  `Evaluating drivers for ${activeMktName} performance, traffic shifts, and SKU risks`
                )
              }
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explain {activeMktName} with AI</span>
            </button>
          </div>

          {/* Drilldown Grid: Revenue Trend & Top/Worst SKUs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Channel Revenue Trend (Spans 2 cols) */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>{activeMktName} Revenue Trend</span>
                </h4>
                <span className="text-xs font-mono text-slate-400">Last {days} Days</span>
              </div>

              {isDetailLoading ? (
                <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                  Loading channel trend...
                </div>
              ) : (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="channelGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val) => [formatCurrency(val), 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#channelGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Channel Metrics Snapshot */}
            <div className="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-3">
              <h4 className="text-sm font-bold text-slate-100 mb-1">Channel Snapshot</h4>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-xs text-slate-400">Total Revenue</span>
                  <span className="text-sm font-extrabold text-slate-100">
                    {formatCurrency(currentDetail?.revenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-xs text-slate-400">Growth Rate</span>
                  <span
                    className={`text-sm font-extrabold ${
                      (currentDetail?.revenue_growth_pct || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatPercent(currentDetail?.revenue_growth_pct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-xs text-slate-400">Conversion Rate</span>
                  <span className="text-sm font-extrabold text-slate-100">
                    {currentDetail?.conversion_rate}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-xs text-slate-400">Return Rate</span>
                  <span className="text-sm font-extrabold text-slate-100">
                    {currentDetail?.return_rate}%
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                💡 <strong>Channel Summary:</strong> {activeMktName} contributes{' '}
                {currentDetail?.revenue_contribution_pct}% of total catalog revenue.
              </div>
            </div>
          </div>

          {/* Top & Worst Performing Products in this Marketplace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Top Revenue Drivers on {activeMktName}</span>
                </h4>
              </div>
              <div className="space-y-2">
                {topProducts.map((p) => (
                  <div
                    key={p.product_id}
                    onClick={() => navigate(`/products/${p.product_id}`)}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-100">{p.product}</h5>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {p.category} • {formatNumber(p.units_sold)} units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-400 block">
                        {formatCurrency(p.revenue)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.conversion_rate}% conv
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst / At Risk Products */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-rose-400 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Underperforming SKUs on {activeMktName}</span>
                </h4>
              </div>
              <div className="space-y-2">
                {worstProducts.map((p) => (
                  <div
                    key={p.product_id}
                    onClick={() => navigate(`/products/${p.product_id}`)}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-100">{p.product}</h5>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {p.category} • {p.days_of_stock ? `${p.days_of_stock}d stock` : 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-300 block">
                        {formatCurrency(p.revenue)}
                      </span>
                      <span className="text-[10px] text-rose-400 font-semibold">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
