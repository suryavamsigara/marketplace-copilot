-- ==============================================================================
-- Marketplace Performance Copilot - Supabase PostgreSQL Database Schema
-- ==============================================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    launch_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS ix_products_category ON products(category);

-- 2. MARKETPLACES TABLE
CREATE TABLE IF NOT EXISTS marketplaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 3. SALES DAILY TABLE
CREATE TABLE IF NOT EXISTS sales_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    visits INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units_sold INTEGER DEFAULT 0,
    revenue NUMERIC(12, 2) DEFAULT 0,
    returns INTEGER DEFAULT 0,
    ad_spend NUMERIC(10, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_sales_daily_date ON sales_daily(date);
CREATE INDEX IF NOT EXISTS ix_sales_daily_product ON sales_daily(product_id);
CREATE INDEX IF NOT EXISTS ix_sales_daily_marketplace ON sales_daily(marketplace_id);
CREATE INDEX IF NOT EXISTS ix_sales_date_product_mkt ON sales_daily(date, product_id, marketplace_id);

-- 4. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    stock INTEGER DEFAULT 0,
    incoming_stock INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_inventory_date ON inventory(date);
CREATE INDEX IF NOT EXISTS ix_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS ix_inventory_marketplace ON inventory(marketplace_id);

-- 5. COMPETITOR PRICES TABLE
CREATE TABLE IF NOT EXISTS competitor_prices (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    our_price NUMERIC(10, 2) NOT NULL,
    competitor_avg_price NUMERIC(10, 2) NOT NULL,
    competitor_min_price NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_competitor_prices_date ON competitor_prices(date);
CREATE INDEX IF NOT EXISTS ix_competitor_prices_product ON competitor_prices(product_id);
CREATE INDEX IF NOT EXISTS ix_competitor_prices_marketplace ON competitor_prices(marketplace_id);

-- 6. OPPORTUNITIES TABLE
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    opportunity_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,
    score NUMERIC(5, 1) NOT NULL,
    title VARCHAR(255) NOT NULL,
    evidence TEXT NOT NULL,
    impact VARCHAR(255),
    recommendation TEXT NOT NULL,
    confidence VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
);

CREATE INDEX IF NOT EXISTS ix_opportunities_type ON opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS ix_opportunities_severity ON opportunities(severity);
CREATE INDEX IF NOT EXISTS ix_opportunities_product ON opportunities(product_id);
CREATE INDEX IF NOT EXISTS ix_opportunities_marketplace ON opportunities(marketplace_id);
CREATE INDEX IF NOT EXISTS ix_opportunities_score ON opportunities(score DESC);
