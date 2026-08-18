import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import KPICard from '../components/KPICard';
import OpportunityCard from '../components/OpportunityCard';
import { KPISkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Sparkles,
  Zap,
  ArrowUpRight,
  AlertTriangle,
  Layers,
  Store,
  Info,
} from 'lucide-react';

const MARKETPLACE_COLORS = {
  Amazon: '#F59E0B',
  Flipkart: '#3B82F6',
  Myntra: '#EC4899',
  Ajio: '#10B981',
};

const CATEGORY_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F97316'];

export default function DashboardPage() {
  const { days, marketplace, category, setActiveTab, openExplain, navigateToProduct } = useFilters();
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly'

  // Fetch KPI Summary
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useQuery({
    queryKey: ['dashboard-summary', days, marketplace, category],
    queryFn: () => api.getDashboardSummary({ days, marketplace, category }),
  });

  // Fetch Revenue Trends
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
  } = useQuery({
    queryKey: ['dashboard-trends', days, marketplace, category, granularity],
    queryFn: () => api.getDashboardTrends({ days, marketplace, category, granularity }),
  });

  // Fetch Marketplace Benchmarking
  const {
    data: marketplacesData,
    isLoading: isMarketplacesLoading,
  } = useQuery({
    queryKey: ['marketplaces-benchmarking', days],
    queryFn: () => api.getMarketplaces({ days }),
  });

  // Fetch Top Products for Scatter & Category Contribution
  const {
    data: productsData,
    isLoading: isProductsLoading,
  } = useQuery({
    queryKey: ['dashboard-products', days, marketplace, category],
    queryFn: () => api.getProducts({ days, marketplace, category, page_size: 50 }),
  });

  // Fetch Top Opportunities
  const {
    data: opportunitiesData,
    isLoading: isOppsLoading,
  } = useQuery({
    queryKey: ['dashboard-opportunities', marketplace, category],
    queryFn: () => api.getOpportunities({ marketplace, category }),
  });

  if (isSummaryError) {
    return (
      <EmptyState
        title="Unable to load dashboard metrics"
        description="Could not connect to the analytics engine. Please ensure the backend is running."
      />
    );
  }

  const kpis = summaryData?.kpis || {};
  const trendList = trendsData?.trend || [];
  const marketplaceList = marketplacesData?.marketplaces || [];
  const productList = productsData?.products || [];
  const oppsList = (opportunitiesData?.opportunities || []).slice(0, 4);

  // Compute Scatter Data (Sales vs Inventory)
  const scatterData = productList
    .filter((p) => p.days_of_stock !== null && p.sales_velocity > 0)
    .map((p) => ({
      name: p.product,
      sku: p.sku,
      days_of_stock: p.days_of_stock,
      sales_velocity: p.sales_velocity,
      revenue_at_risk: p.revenue_at_risk,
      revenue: p.revenue,
      status: p.status,
      product_id: p.product_id,
    }));

  // Compute Category Revenue Breakdown for Donut Chart
  const categoryMap = productList.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.revenue;
    return acc;
  }, {});
  const categoryDonutData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto">
      {/* 1. KPI CARDS STRIP */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Key Performance Indicators</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {summaryData?.period ? `${summaryData.period.start} → ${summaryData.period.end}` : ''}
          </span>
        </div>

        {isSummaryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              id="revenue"
              title="Revenue"
              value={formatCurrency(kpis.revenue?.value)}
              previousValue={formatCurrency(kpis.revenue?.previous)}
              changePct={kpis.revenue?.change_pct}
              subtitle="Gross GMV before returns"
            />
            <KPICard
              id="orders"
              title="Orders"
              value={formatNumber(kpis.orders?.value)}
              previousValue={formatNumber(kpis.orders?.previous)}
              changePct={kpis.orders?.change_pct}
              subtitle="Confirmed order volume"
            />
            <KPICard
              id="units_sold"
              title="Units Sold"
              value={formatNumber(kpis.units_sold?.value)}
              previousValue={formatNumber(kpis.units_sold?.previous)}
              changePct={kpis.units_sold?.change_pct}
              subtitle="Item quantity dispatched"
            />
            <KPICard
              id="conversion_rate"
              title="Conversion Rate"
              value={`${Number(kpis.conversion_rate?.value || 0).toFixed(2)}%`}
              previousValue={`${Number(kpis.conversion_rate?.previous || 0).toFixed(2)}%`}
              changePct={kpis.conversion_rate?.change_pct}
              subtitle="Orders / visits ratio"
            />
            <KPICard
              id="avg_order_value"
              title="Avg Order Value"
              value={formatCurrency(kpis.avg_order_value?.value)}
              previousValue={formatCurrency(kpis.avg_order_value?.previous)}
              changePct={kpis.avg_order_value?.change_pct}
              subtitle="Revenue per order"
            />
            <KPICard
              id="return_rate"
              title="Return Rate"
              value={`${Number(kpis.return_rate?.value || 0).toFixed(2)}%`}
              previousValue={`${Number(kpis.return_rate?.previous || 0).toFixed(2)}%`}
              changePct={kpis.return_rate?.change_pct}
              inverseSentiment={true}
              subtitle="% of units returned"
            />
          </div>
        )}
      </div>

      {/* 2. MAIN CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: REVENUE TREND (Line/Area) - Spans 2 cols */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>Revenue Trend</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Daily / Weekly aggregate)
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Tracking sales velocity and demand momentum over selected period
              </p>
            </div>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setGranularity('daily')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${granularity === 'daily'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setGranularity('weekly')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${granularity === 'weekly'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Loading trend data...
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
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
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 2: MARKETPLACE PERFORMANCE (Bar) */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100">Marketplace Share</h4>
              <p className="text-xs text-slate-400">Revenue split across channels</p>
            </div>
            <button
              onClick={() => setActiveTab('marketplaces')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isMarketplacesLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Loading marketplace data...
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketplaceList} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <YAxis type="category" dataKey="marketplace" stroke="#94A3B8" fontSize={11} width={65} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val, name, item) => [
                      `${formatCurrency(val)} (${item.payload.revenue_growth_pct > 0 ? '+' : ''}${item.payload.revenue_growth_pct}%)`,
                      'Revenue',
                    ]}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {marketplaceList.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MARKETPLACE_COLORS[entry.marketplace] || '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 3. CHARTS ROW 2: SCATTER (Sales vs Inventory) & CATEGORY DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 4: SCATTER PLOT (Sales Velocity vs Inventory Days) - Spans 2 cols */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-slate-100">Sales Velocity vs Inventory Days</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Stock-out Watchlist
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Top-left quadrant indicates high-velocity SKUs with dangerous stock-out risk (&lt;14 days)
              </p>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-3">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" /> Critical (&lt;7d)
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" /> Attention (7-14d)
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" /> Healthy (&gt;14d)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="days_of_stock"
                  name="Days of Stock"
                  unit="d"
                  stroke="#64748B"
                  fontSize={11}
                />
                <YAxis
                  type="number"
                  dataKey="sales_velocity"
                  name="Daily Velocity"
                  unit="u/d"
                  stroke="#64748B"
                  fontSize={11}
                />
                <ZAxis type="number" dataKey="revenue" range={[40, 260]} name="Revenue" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="custom-recharts-tooltip text-xs space-y-1">
                          <p className="font-bold text-amber-300">{data.name}</p>
                          <p className="text-slate-300 font-mono text-[11px]">SKU: {data.sku}</p>
                          <div className="border-t border-slate-700/60 pt-1 space-y-0.5">
                            <p>Days Remaining: <strong className="text-white">{data.days_of_stock} days</strong></p>
                            <p>Velocity: <strong className="text-white">{data.sales_velocity} units/day</strong></p>
                            {data.revenue_at_risk > 0 && (
                              <p className="text-rose-400 font-semibold">
                                Exposure: {formatCurrency(data.revenue_at_risk)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Products"
                  data={scatterData}
                  onClick={(node) => navigateToProduct(node.product_id)}
                  cursor="pointer"
                >
                  {scatterData.map((entry, index) => {
                    let fill = '#10B981';
                    if (entry.days_of_stock < 7) fill = '#F43F5E';
                    else if (entry.days_of_stock < 14) fill = '#F59E0B';
                    return <Cell key={`scatter-${index}`} fill={fill} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: CATEGORY REVENUE BREAKDOWN */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100">Category Contribution</h4>
            <p className="text-xs text-slate-400">Revenue split across footwear categories</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryDonutData.map((_, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [formatCurrency(val), 'Revenue']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. CRITICAL TOP OPPORTUNITIES SECTION */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100">Top Prioritized Opportunities</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                Urgency Ranked
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-impact operational decisions generated by the deterministic opportunity engine
            </p>
          </div>

          <button
            onClick={() => setActiveTab('opportunities')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <span>View All Opportunities</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {isOppsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 h-64 animate-pulse bg-slate-900/60" />
            ))}
          </div>
        ) : oppsList.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl text-xs text-slate-400">
            No critical opportunities matching current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {oppsList.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
