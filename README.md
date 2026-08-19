# Marketplace Performance Copilot

An internal business intelligence and AI decision-support platform for marketplace operations teams.

The product follows a strict operational decision-making pipeline:
$$\textbf{DATA} \longrightarrow \textbf{ANALYZE} \longrightarrow \textbf{DETECT OPPORTUNITIES} \longrightarrow \textbf{EXPLAIN} \longrightarrow \textbf{RECOMMEND ACTION} \longrightarrow \textbf{DECISION}$$

---

## 1. Problem Statement

Marketplace operations teams managing multi-channel catalogs (across Amazon, Flipkart, Myntra, and Ajio) grapple with disconnected dashboards and lagging metrics. When revenue shifts, managers spend hours running ad-hoc spreadsheet calculations to figure out:
1. **WHAT HAPPENED?** (Which channels, categories, or SKUs moved?)
2. **WHY DID IT HAPPEN?** (Traffic drop? Conversion erosion? Stock-out? Pricing pressure? Return spike?)
3. **WHAT SHOULD WE DO?** (Replenish inventory, adjust pricing, investigate listing, reallocate ad spend?)
4. **WHAT SHOULD WE PRIORITIZE FIRST?** (Which issue carries the highest immediate revenue exposure?)

Existing tools either provide dumb dashboards with zero automated reasoning or generic chatbots that hallucinate metrics.

---

## 2. Solution & Core Principle

**Marketplace Performance Copilot** strictly decouples deterministic data computation from AI reasoning:
* **Deterministic Analytics Engine (Python / Pandas):** Computes 100% of the mathematical aggregations (revenue, orders, units, conversion, return rate, sales velocity, inventory coverage days, revenue-at-risk, opportunity score).
* **Opportunity Detection Engine (Python):** Deterministically flags stock-out risks, conversion anomalies, pricing competitiveness, return spikes, excess inventory, and marketplace declines.
* **AI Copilot & Tool-Calling Layer (FastAPI + OpenAI GPT-4o-mini):** Calls read-only analytical tools to retrieve verified data, synthesizes root causes, and structures prioritized recommendations.
* **Modern Executive Dashboard (React + Vite + Tailwind CSS + Recharts + TanStack Query):** High-density, responsive interface with instant "✨ Explain" root-cause triggers across all KPIs and opportunities.

---

## 3. Business Impact

* **Reduced Manual Analysis:** Replaces manual spreadsheet cross-joins with real-time analytics.
* **Proactive Revenue Protection:** Flags stock-outs 3–7 days before inventory is exhausted, calculating estimated revenue exposure.
* **Instant Root-Cause Attribution:** Explains complex period-over-period shifts in seconds with full evidence trails.
* **Prioritized Action Plan:** Uses a quantifiable score heuristic ($Impact \times Urgency \times Confidence$) so operators focus on high-impact actions first.

---

## 4. Key Features & Application Screens

### 1. Executive Overview
* **Dynamic KPI Cards:** Revenue, Orders, Units Sold, Conversion Rate, Average Order Value (AOV), and Return Rate with period-over-period % comparisons and instant **"✨ Explain"** buttons.
* **Revenue Trend Chart:** Daily & Weekly trend toggle with gradient area visualization.
* **Marketplace Share & Growth:** Side-by-side volume and growth benchmarking across Amazon, Flipkart, Myntra, and Ajio.
* **Sales Velocity vs. Inventory Days Scatter Plot:** Identifies high-velocity, low-stock SKUs at risk of imminent stock-out.
* **Category Contribution:** Visual revenue split across catalog segments.
* **Top Prioritized Opportunities:** Real-time stream of urgent business decisions.

### 2. Marketplace Intelligence
* **Channel Benchmarking Table:** Revenue, growth rates, conversion %, AOV, return rates, stock-out counts, and health status (`Healthy`, `Needs Attention`, `Critical`).
* **Channel Drilldown:** Detailed revenue curves, top-performing SKUs, underperforming SKUs, and channel-specific AI summaries.

### 3. Product Intelligence
* **Full SKU Directory Table:** Searchable, sortable, and filterable by marketplace, category, and risk level.
* **Pagination & Metric Gauges:** Displays sales velocity, days of stock remaining, and revenue-at-risk.
* **Product Detail View:** Detailed unit economics (Price, Cost, Gross Margin %), daily revenue/orders demand, 90-day inventory depletion curves, and structured AI SKU diagnosis.

### 4. Business Opportunities Page
* **Ranked Opportunity Feed:** Filterable by severity (`Critical`, `High`, `Medium`, `Low`) and opportunity type.
* **Quantified Impact & Recommendations:** Shows estimated financial exposure, supporting evidence bullets, and actionable next steps.

### 5. AI Copilot
* **Natural-Language Inquiries:** Pre-configured prompt shortcuts and arbitrary business queries.
* **Structured Response Format:** Summary, Main Drivers, Evidence, Recommended Actions, Estimated Impact, and Confidence.
* **Tool-Calling Transparency:** Expandable drawer showing which deterministic Python tools were executed.
* **Deterministic Fallback Mode:** Operates fully even without an OpenAI API key.

---

## 5. Architecture

```mermaid
flowchart TD
    subgraph Frontend["React 19 + Vite (Tailwind CSS, Recharts, TanStack Query)"]
        UI["Executive Dashboard / SKU Table / Copilot UI"]
        Modal["AI Explain Modal"]
    end

    subgraph Backend["FastAPI Monolith"]
        API["REST API Endpoints"]
        Analytics["Deterministic Analytics Engine (Pandas/NumPy)"]
        Opportunities["Opportunity Detection Engine"]
        Tools["AI Business Tools"]
        Copilot["Copilot Orchestrator (Tool Loop)"]
    end

    subgraph Database["Supabase (PostgreSQL)"]
        DB[(PostgreSQL / SQLite fallback)]
    end

    subgraph AI["AI Reasoning Layer"]
        LLM["OpenAI GPT-4o-mini"]
    end

    UI -->|HTTP Requests| API
    Modal -->|Explain Requests| API
    API --> Analytics
    API --> Opportunities
    API --> Copilot
    Analytics --> DB
    Opportunities --> DB
    Copilot --> Tools
    Tools --> Analytics
    Tools --> Opportunities
    Copilot -->|Function Calling| LLM
```

---

## 6. Analytics Methodology & Deterministic Calculations

All metrics are computed in `app/services/analytics_engine.py`:

| Metric | Formula |
|---|---|
| **Conversion Rate** | $\frac{\text{Total Orders}}{\text{Total Visits}} \times 100$ |
| **Average Order Value (AOV)** | $\frac{\text{Total Revenue}}{\text{Total Orders}}$ |
| **Return Rate** | $\frac{\text{Total Returned Units}}{\text{Total Dispatched Units}} \times 100$ |
| **Sales Velocity** | $\frac{\text{Units Sold in Period}}{\text{Days in Period}}$ |
| **Days of Stock** | $\frac{\text{Current Inventory}}{\text{Daily Sales Velocity}}$ |
| **Revenue at Risk** | $\text{Daily Sales Velocity} \times \min(\text{Days of Stock}, 14) \times \text{Average Selling Price}$ |

### Stock-out Severity Thresholds
* **Critical:** $< 3$ days of inventory remaining.
* **High:** $3 \le \text{Days} < 7$.
* **Medium:** $7 \le \text{Days} < 14$.
* **Healthy:** $\ge 14$ days.

---

## 7. Opportunity Scoring Heuristic

$$\text{Opportunity Score} = \text{Business Impact} \times \text{Urgency} \times \text{Confidence} \quad (\text{Normalized } 0 - 100)$$

* **Business Impact (0–1):** Proportional to revenue at risk relative to catalog revenue.
* **Urgency (0–1):** Derived from proximity to stock-out ($1 - \frac{\text{Days of Stock}}{14}$) or rate of conversion decline.
* **Confidence Weight:** `High` = 1.0, `Medium` = 0.75, `Low` = 0.5.

---

## 8. Data Model & Supabase Setup

The application uses 6 tables with foreign keys and composite indexes:

* `products` (id, sku, name, category, price, cost, launch_date)
* `marketplaces` (id, name)
* `sales_daily` (id, date, product_id, marketplace_id, impressions, clicks, visits, orders, units_sold, revenue, returns, ad_spend)
* `inventory` (id, date, product_id, marketplace_id, stock, incoming_stock)
* `competitor_prices` (id, date, product_id, marketplace_id, our_price, competitor_avg_price, competitor_min_price)
* `opportunities` (id, opportunity_type, severity, product_id, marketplace_id, score, title, evidence, impact, recommendation, confidence, created_at)

### Supabase Connection
1. In your [Supabase Dashboard](https://supabase.com), navigate to **Project Settings → Database → Connection String**.
2. Copy the URI and set it in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
3. Run the database seed script to initialize tables and synthetic scenario data:
   ```bash
   cd backend
   uv run scripts/seed_database.py
   ```

---

## 9. Local Development Quickstart

### Prerequisites
* Python 3.11+ and `uv` (or `pip`)
* Node.js 18+ and `npm`

### 1. Backend Setup
```bash
cd backend
uv sync

# Seed synthetic database (creates ~130 products, 4 channels, 90 days of history, opportunities)
uv run scripts/seed_database.py

# Start FastAPI backend
uv run uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 10. Deployment Guide

### Frontend (Vercel)
1. Push this repository to GitHub.
2. Import project into Vercel with Root Directory set to `frontend`.
3. Build Command: `npm run build`, Output Directory: `dist`.
4. Set Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`.

### Backend (Render / AWS)
1. Deploy `backend` as a Web Service on Render or AWS App Runner.
2. Build Command: `uv sync`.
3. Start Command: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Set Environment Variables:
   * `DATABASE_URL` (Supabase connection string)
   * `LLM_API_KEY` (OpenAI API key)
   * `ALLOWED_ORIGINS` (Your Vercel frontend URL)

---

## 11. Assumptions & Limitations

* **Synthetic Data:** All sales, inventory, and pricing data are deterministically generated with fixed random seeds for reproducible demonstration.
* **Revenue at Risk:** A heuristic exposure metric assuming recent velocity continues, not an audited accounting forecast.
* **Deterministic Fallback:** When `LLM_API_KEY` is not provided, the Copilot seamlessly generates verified structured summaries directly from the analytics engine.
