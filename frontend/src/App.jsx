import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider, useFilters } from './context/FilterContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ExplainModal from './components/ExplainModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import MarketplacesPage from './pages/MarketplacesPage';
import ProductsPage from './pages/ProductsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import CopilotPage from './pages/CopilotPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 mins
      retry: 1,
    },
  },
});

function AppContent() {
  const { activeTab } = useFilters();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardPage />;
      case 'marketplaces':
        return <MarketplacesPage />;
      case 'products':
        return <ProductsPage />;
      case 'opportunities':
        return <OpportunitiesPage />;
      case 'copilot':
        return <CopilotPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto pb-12">
          {renderActivePage()}
        </main>
      </div>

      {/* Global AI Root-Cause Explain Modal */}
      <ExplainModal />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <AppContent />
      </FilterProvider>
    </QueryClientProvider>
  );
}
