import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import HealthBadge from '../components/HealthBadge';
import { ChartSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  ArrowLeft,
  Package,
  DollarSign,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function ProductDetailPage({ productId, onBack }) {
  const { days, openExplain, setActiveTab } = useFilters();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product-detail', productId, days],
    queryFn: () => api.getProductDetail(productId, { days }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-40 bg-slate-800/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product Catalog</span>
        </button>
        <EmptyState
          title="Product not found"
          description="Could not load analytics for this SKU."
          onAction={onBack}
          actionLabel="Back to Catalog"
        />
      </div>
    );
  }

  const trendData = product.trend || [];
  const inventoryTrend = product.inventory_trend || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        <button
          onClick={() =>
            openExplain(
              'kpi',
              `product_${product.product_id}`,
              `AI Diagnosis: ${product.name}`,
              `Deep-dive analysis on velocity, inventory depletion, and conversion performance`
            )
          }
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explain SKU with AI</span>
        </button>
      </div>

      {/* Product Hero Banner */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                {product.sku}
              </span>
              <span className="text-xs text-slate-400 font-medium">{product.category}</span>
              {product.days_of_stock !== null && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    product.days_of_stock < 3
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : product.days_of_stock < 7
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {product.days_of_stock < 7 ? '⚠️ Stockout Risk' : 'Healthy Inventory'}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {product.name}
            </h2>
          </div>

          {/* Pricing & Margin Badges */}
          <div className="flex items-center space-x-4 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Selling Price
              </span>
              <span className="text-sm font-extrabold text-slate-100">
                {formatCurrency(product.price)}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Unit Cost
              </span>
              <span className="text-sm font-extrabold text-slate-400">
                {formatCurrency(product.cost)}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Gross Margin
              </span>
              <span className="text-sm font-extrabold text-emerald-400">
                {product.margin_pct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Revenue</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block">
            {formatCurrency(product.revenue)}
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Units Sold</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block">
            {formatNumber(product.units_sold)}
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conversion</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block font-mono">
            {product.conversion_rate}%
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Return Rate</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block font-mono">
            {product.return_rate}%
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Stock</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block font-mono">
            {formatNumber(product.inventory)}
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Velocity</span>
          <span className="text-base font-extrabold text-slate-100 mt-1 block font-mono">
            {product.sales_velocity} u/d
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Days Remaining</span>
          <span
            className={`text-base font-extrabold mt-1 block font-mono ${
              product.days_of_stock !== null && product.days_of_stock < 7
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
          >
            {product.days_of_stock !== null ? `${product.days_of_stock}d` : 'N/A'}
          </span>
        </div>
        <div className="glass-card rounded-xl p-3.5 text-center relative group">
          <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center space-x-1">
            <span>Rev at Risk</span>
            <HelpCircle className="w-3 h-3 text-slate-400" />
          </span>
          <span className="text-base font-extrabold text-rose-400 mt-1 block font-mono">
            {product.revenue_at_risk > 0 ? formatCurrency(product.revenue_at_risk) : '₹0'}
          </span>
        </div>
      </div>

      {/* Trend Charts: Daily Revenue & Inventory Depletion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue & Units Sold */}
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
            <span>Daily Revenue & Unit Demand</span>
            <span className="text-xs text-slate-400 font-normal">Last {days} Days</span>
          </h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
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
                  formatter={(val, name) => [
                    name === 'revenue' ? formatCurrency(val) : formatNumber(val),
                    name === 'revenue' ? 'Revenue' : 'Units Sold',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#prodRevGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 90-Day Inventory Depletion Trend */}
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
            <span>Inventory Depletion & Stock Curve</span>
            <span className="text-xs text-slate-400 font-normal">Full 90-day History</span>
          </h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${formatNumber(val)} units`, 'Inventory Stock']}
                />
                <Line
                  type="monotone"
                  dataKey="stock"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Reasoning Analysis Card */}
      <div className="glass-card rounded-2xl p-6 border border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI SKU Operational Intelligence</h3>
              <p className="text-xs text-slate-400">Deterministic metric synthesis & recommended action</p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Confidence: High
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-400 block mb-1.5">
              1. What is Happening?
            </span>
            <p className="text-slate-300 leading-relaxed">
              {product.name} is selling at ~{product.sales_velocity} units/day with{' '}
              {product.inventory} units remaining in active fulfillment inventory.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-bold text-[11px] uppercase tracking-wider text-rose-400 block mb-1.5">
              2. Why It Matters
            </span>
            <p className="text-slate-300 leading-relaxed">
              {product.days_of_stock !== null && product.days_of_stock < 7
                ? `Stock will be exhausted in ~${product.days_of_stock} days, creating ${formatCurrency(
                    product.revenue_at_risk
                  )} in near-term revenue exposure.`
                : `Product exhibits stable operational metrics with ${product.days_of_stock || 'healthy'} days coverage.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-400 block mb-1.5">
              3. Recommended Action
            </span>
            <p className="text-slate-300 leading-relaxed">
              {product.days_of_stock !== null && product.days_of_stock < 7
                ? 'Expedite replenishment PO or shift inventory from lower-velocity warehouse nodes.'
                : 'Maintain current marketing spend and monitor competitor pricing benchmarks.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
