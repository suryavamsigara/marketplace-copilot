import React, { useState } from 'react';
import { useFilters } from '../context/FilterContext';
import {
  LayoutDashboard,
  Store,
  Package,
  Zap,
  Sparkles,
  Database,
  TrendingUp,
  ShieldCheck,
  PanelLeft,
  PanelRight,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    subtitle: 'Executive Summary & KPIs',
    icon: LayoutDashboard,
  },
  {
    id: 'marketplaces',
    label: 'Marketplaces',
    subtitle: 'Channel Comparison & Health',
    icon: Store,
  },
  {
    id: 'products',
    label: 'Products',
    subtitle: 'SKU Intelligence & Inventory',
    icon: Package,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    subtitle: 'Prioritized Business Actions',
    icon: Zap,
    badge: 'Ranked',
  },
  {
    id: 'copilot',
    label: 'AI Copilot',
    subtitle: 'Evidence-Grounded Assistant',
    icon: Sparkles,
    badge: 'AI',
  },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, setSelectedProductId, setSelectedMarketplace } = useFilters();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (id) => {
    if (id !== 'products') setSelectedProductId(null);
    if (id !== 'marketplaces') setSelectedMarketplace(null);
    setActiveTab(id);
  };

  return (
    <aside
      className={`sticky top-0 self-start h-screen flex-shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between select-none transition-all duration-300 ease-in-out overflow-y-auto ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/60">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-800 p-[1px] flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
            </div>


            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-bold text-slate-100 text-sm tracking-tight">Marketplace</h1>
                </div>
                <p className="text-xs text-slate-400 font-medium tracking-wide">Performance Copilot</p>
              </div>
            )}

            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-3">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Expand sidebar"
            >
              <PanelRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-left text-sm font-medium transition-all group ${isCollapsed
                  ? 'justify-center px-2 py-3'
                  : 'justify-between px-3.5 py-2.5'
                  } ${isActive
                    ? 'bg-slate-800 text-slate-100 border border-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                  <Icon
                    className={`w-4 h-4 transition-colors flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      {!isCollapsed ? (
        <div className="p-4 border-t border-slate-800/60 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-300">Deterministic Engine</span>
              </div>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Python analytics & 100% verified tool grounding.
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400/70" />
              <span>Supabase Ready</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">v1.0</span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-800/60 flex justify-center">
        </div>
      )}
    </aside>
  );
}