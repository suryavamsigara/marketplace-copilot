/**
 * Centralized API client communicating with the FastAPI backend.
 * Uses configurable VITE_API_URL or defaults to relative '/api' via Vite dev proxy.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.error || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard
  getDashboardSummary: ({ days = 30, marketplace, category } = {}) => {
    const params = new URLSearchParams({ days });
    if (marketplace) params.append('marketplace', marketplace);
    if (category) params.append('category', category);
    return fetchJson(`/api/dashboard/summary?${params.toString()}`);
  },

  getDashboardTrends: ({ days = 30, marketplace, category, granularity = 'daily' } = {}) => {
    const params = new URLSearchParams({ days, granularity });
    if (marketplace) params.append('marketplace', marketplace);
    if (category) params.append('category', category);
    return fetchJson(`/api/dashboard/trends?${params.toString()}`);
  },

  // Marketplaces
  getMarketplaces: ({ days = 30 } = {}) => {
    return fetchJson(`/api/marketplaces?days=${days}`);
  },

  getMarketplaceDetail: (name, { days = 30 } = {}) => {
    return fetchJson(`/api/marketplaces/${encodeURIComponent(name)}?days=${days}`);
  },

  // Products
  getProducts: ({
    days = 30,
    marketplace,
    category,
    risk_level,
    search,
    sort_by = 'revenue',
    sort_dir = 'desc',
    page = 1,
    page_size = 25,
  } = {}) => {
    const params = new URLSearchParams({
      days,
      sort_by,
      sort_dir,
      page,
      page_size,
    });
    if (marketplace) params.append('marketplace', marketplace);
    if (category) params.append('category', category);
    if (risk_level) params.append('risk_level', risk_level);
    if (search) params.append('search', search);
    return fetchJson(`/api/products?${params.toString()}`);
  },

  getProductDetail: (productId, { days = 30 } = {}) => {
    return fetchJson(`/api/products/${productId}?days=${days}`);
  },

  // Opportunities
  getOpportunities: ({
    severity,
    opportunity_type,
    marketplace,
    category,
    page = 1,
    page_size = 12,
  } = {}) => {
    const params = new URLSearchParams({
      page,
      page_size,
    });
    if (severity && severity !== 'All') params.append('severity', severity);
    if (opportunity_type) params.append('opportunity_type', opportunity_type);
    if (marketplace) params.append('marketplace', marketplace);
    if (category) params.append('category', category);
    return fetchJson(`/api/opportunities?${params.toString()}`);
  },

  getOpportunityDetail: (opportunityId) => {
    return fetchJson(`/api/opportunities/${opportunityId}`);
  },

  // Inventory
  getInventoryRisks: ({ days = 30 } = {}) => {
    return fetchJson(`/api/inventory/risks?days=${days}`);
  },

  // AI Copilot
  sendCopilotChat: ({ message, history = [] }) => {
    return fetchJson('/api/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  },

  explainSubject: ({ subject_type, subject_id }) => {
    return fetchJson('/api/copilot/explain', {
      method: 'POST',
      body: JSON.stringify({ subject_type, subject_id }),
    });
  },
};
