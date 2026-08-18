import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import ProductDetailPage from './ProductDetailPage';
import HealthBadge from '../components/HealthBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  Package,
  Search,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export default function ProductsPage() {
  const {
    days,
    marketplace,
    category,
    selectedProductId,
    setSelectedProductId,
  } = useFilters();

  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Fetch product table data
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'products-table',
      days,
      marketplace,
      category,
      riskLevel,
      search,
      sortBy,
      sortDir,
      page,
      pageSize,
    ],
    queryFn: () =>
      api.getProducts({
        days,
        marketplace,
        category,
        risk_level: riskLevel || undefined,
        search: search || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize,
      }),
  });

  // If a product is selected, render ProductDetailPage!
  if (selectedProductId) {
    return (
      <ProductDetailPage
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
      />
    );
  }

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span>Product Catalog Intelligence</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({total} SKUs)
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Granular SKU performance, inventory depletion, return anomalies, and revenue-at-risk
          </p>
        </div>

        {/* Search & Risk Level Filter */}
        <div className="flex items-center space-x-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-56"
            />
          </div>

          {/* Risk Level Filter */}
          <select
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by risk status"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Statuses</option>
            <option value="Critical">Critical Only</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="Healthy">Healthy Only</option>
          </select>
        </div>
      </div>

      {/* Main SKU Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={10} />
      ) : isError ? (
        <EmptyState
          title="Error loading products"
          description="Could not connect to the product analytics engine."
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products match your filters"
          description="Try clearing search queries or risk level filters to view catalog SKUs."
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('product')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Product & SKU</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Marketplace</th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Revenue</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('units_sold')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Units</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('conversion_rate')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Conversion</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('return_rate')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Returns</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5">Stock</th>
                  <th className="px-4 py-3.5">Velocity</th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('days_of_stock')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Days of Stock</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-amber-400 transition"
                    onClick={() => handleSort('revenue_at_risk')}
                    title="Estimated revenue you could lose if this SKU runs out of stock"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rev At Risk</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const isStockoutCritical = p.days_of_stock !== null && p.days_of_stock < 3;
                  const isStockoutWarning = p.days_of_stock !== null && p.days_of_stock < 7;
                  return (
                    <tr
                      key={p.product_id}
                      onClick={() => setSelectedProductId(p.product_id)}
                      className="hover:bg-slate-900/80 transition cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-100 group-hover:text-amber-300 transition">
                          {p.product}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {p.sku}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{p.category}</td>
                      <td className="px-4 py-4 text-slate-400">{p.marketplace}</td>
                      <td className="px-4 py-4 font-semibold text-slate-100">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="px-4 py-4">{formatNumber(p.units_sold)}</td>
                      <td className="px-4 py-4 font-mono">{p.conversion_rate}%</td>
                      <td className="px-4 py-4 font-mono">
                        <span
                          className={
                            p.return_rate > (p.category_avg_return_rate || 5) * 1.5
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-300'
                          }
                        >
                          {p.return_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-200">
                        {formatNumber(p.inventory)}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-400">
                        {p.sales_velocity} u/d
                      </td>
                      <td className="px-4 py-4 font-mono">
                        {p.days_of_stock !== null ? (
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${isStockoutCritical
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isStockoutWarning
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'text-slate-300'
                              }`}
                          >
                            {p.days_of_stock}d
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {p.revenue_at_risk > 0 ? (
                          <span className="text-rose-400 font-bold font-mono">
                            {formatCurrency(p.revenue_at_risk)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">₹0</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <HealthBadge health={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(page * pageSize, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-200">{total}</span> SKUs
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-medium text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
