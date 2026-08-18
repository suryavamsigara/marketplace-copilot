import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext(null);

export const MARKETPLACES = ['Amazon', 'Myntra', 'Flipkart', 'Ajio'];
export const CATEGORIES = ['Running', 'Sneakers', 'Slip-ons', 'Loafers', 'Sandals', 'Casual'];
export const DATE_RANGES = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 14 Days', value: 14 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 60 Days', value: 60 },
  { label: 'Last 90 Days', value: 90 },
];

export function FilterProvider({ children }) {
  const [days, setDays] = useState(30);
  const [marketplace, setMarketplace] = useState('');
  const [category, setCategory] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'marketplaces' | 'products' | 'opportunities' | 'copilot'
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);

  // Global Explain Modal state
  const [explainModal, setExplainModal] = useState({
    isOpen: false,
    subjectType: null, // 'kpi' | 'opportunity'
    subjectId: null,
    title: '',
    subtitle: '',
  });

  const openExplain = (subjectType, subjectId, title = '', subtitle = '') => {
    setExplainModal({
      isOpen: true,
      subjectType,
      subjectId: String(subjectId),
      title: title || `AI Analysis: ${subjectId}`,
      subtitle: subtitle || 'Retrieving deterministic metrics & synthesizing reasoning...',
    });
  };

  const closeExplain = () => {
    setExplainModal((prev) => ({ ...prev, isOpen: false }));
  };

  const navigateToProduct = (productId) => {
    setSelectedProductId(productId);
    setActiveTab('products');
  };

  const navigateToMarketplace = (mktName) => {
    setSelectedMarketplace(mktName);
    setActiveTab('marketplaces');
  };

  const resetFilters = () => {
    setDays(30);
    setMarketplace('');
    setCategory('');
  };

  return (
    <FilterContext.Provider
      value={{
        days,
        setDays,
        marketplace,
        setMarketplace,
        category,
        setCategory,
        activeTab,
        setActiveTab,
        selectedProductId,
        setSelectedProductId,
        selectedMarketplace,
        setSelectedMarketplace,
        explainModal,
        openExplain,
        closeExplain,
        navigateToProduct,
        navigateToMarketplace,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
