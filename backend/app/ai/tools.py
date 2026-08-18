"""
Tool functions the AI Copilot can call. Every tool returns REAL data
computed by the deterministic analytics/opportunity engines - the LLM never
receives raw database rows and never calculates metrics itself.

Optimized with cached AnalyticsEngine instance sharing across tool executions.
"""
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.services.analytics_engine import AnalyticsEngine
from app.services import opportunity_engine as oe
from app.models.models import Opportunity, Product, Marketplace


def get_dashboard_summary(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return eng.dashboard_summary()


def get_revenue_trend(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return {"trend": eng.revenue_trend()}


def get_marketplace_metrics(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return {"marketplaces": eng.marketplace_metrics()}


def get_marketplace_performance(db: Session, marketplace: str, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    detail = eng.marketplace_detail(marketplace_name=marketplace)
    return detail or {"error": f"Marketplace '{marketplace}' not found"}


def get_product_metrics(db: Session, product_id: int = None, product_name: str = None, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    if product_id:
        return eng.product_detail(product_id=product_id) or {"error": "Product not found"}
    if product_name:
        rows = eng.product_table()
        match = next((r for r in rows if product_name.lower() in r["product"].lower()), None)
        if match:
            return eng.product_detail(product_id=match["product_id"])
    return {"error": "Product not found"}


def get_top_products(db: Session, days: int = 30, limit: int = 10, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    rows = eng.product_table()
    return {"products": rows[:limit]}


def get_underperforming_products(db: Session, days: int = 30, limit: int = 10, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    rows = eng.product_table()
    risky = [r for r in rows if r["status"] in ("Critical", "Needs Attention")]
    risky.sort(key=lambda r: (r["status"] != "Critical", -(r["revenue_at_risk"] or 0)))
    return {"products": risky[:limit]}


def get_inventory_risks(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    rows = eng.product_table()
    at_risk = [r for r in rows if r["days_of_stock"] is not None and r["days_of_stock"] < 14]
    at_risk.sort(key=lambda r: r["days_of_stock"])
    return {"at_risk_products": at_risk}


def get_return_rate_anomalies(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return {"anomalies": oe.detect_return_anomalies(db, days=days, engine=eng)}


def get_pricing_opportunities(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return {"opportunities": oe.detect_pricing_opportunities(db, days=days, engine=eng)}


def get_business_opportunities(db: Session, severity: str = None, limit: int = 15, engine: Optional[AnalyticsEngine] = None) -> dict:
    q = db.query(Opportunity)
    if severity and severity != "All":
        q = q.filter(Opportunity.severity == severity)
    opps = q.order_by(Opportunity.score.desc()).limit(limit).all()
    if not opps:
        return {"opportunities": []}

    prod_ids = [o.product_id for o in opps if o.product_id]
    mkt_ids = [o.marketplace_id for o in opps if o.marketplace_id]

    prod_map = {p.id: p.name for p in db.query(Product.id, Product.name).filter(Product.id.in_(prod_ids)).all()} if prod_ids else {}
    mkt_map = {m.id: m.name for m in db.query(Marketplace.id, Marketplace.name).filter(Marketplace.id.in_(mkt_ids)).all()} if mkt_ids else {}

    result = []
    for o in opps:
        entity = prod_map.get(o.product_id) or mkt_map.get(o.marketplace_id) or "Business-wide"
        try:
            ev = json.loads(o.evidence) if isinstance(o.evidence, str) else o.evidence
        except Exception:
            ev = [str(o.evidence)]
        result.append({
            "id": o.id,
            "type": o.opportunity_type,
            "severity": o.severity,
            "score": float(o.score),
            "title": o.title,
            "entity": entity,
            "evidence": ev,
            "recommendation": o.recommendation,
            "confidence": o.confidence,
        })
    return {"opportunities": result}


def compare_periods(db: Session, days: int = 30, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=days)
    return eng.dashboard_summary()


TOOL_REGISTRY = {
    "get_dashboard_summary": get_dashboard_summary,
    "get_revenue_trend": get_revenue_trend,
    "get_marketplace_metrics": get_marketplace_metrics,
    "get_marketplace_performance": get_marketplace_performance,
    "get_product_metrics": get_product_metrics,
    "get_top_products": get_top_products,
    "get_underperforming_products": get_underperforming_products,
    "get_inventory_risks": get_inventory_risks,
    "get_return_rate_anomalies": get_return_rate_anomalies,
    "get_pricing_opportunities": get_pricing_opportunities,
    "get_business_opportunities": get_business_opportunities,
    "compare_periods": compare_periods,
}

TOOL_SCHEMAS = [
    {"type": "function", "function": {
        "name": "get_dashboard_summary", "description": "Get overall KPIs (revenue, orders, conversion, AOV, return rate) with period-over-period change.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer", "description": "Lookback window in days"}}},
    }},
    {"type": "function", "function": {
        "name": "get_revenue_trend", "description": "Get the daily revenue/orders/units trend series.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_marketplace_metrics", "description": "Get performance metrics for all marketplaces (Amazon, Myntra, Flipkart, Ajio).",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_marketplace_performance", "description": "Get detailed performance for one named marketplace.",
        "parameters": {"type": "object", "properties": {
            "marketplace": {"type": "string"}, "days": {"type": "integer"}}, "required": ["marketplace"]},
    }},
    {"type": "function", "function": {
        "name": "get_product_metrics", "description": "Get detailed metrics for one product by id or name.",
        "parameters": {"type": "object", "properties": {
            "product_id": {"type": "integer"}, "product_name": {"type": "string"}, "days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_top_products", "description": "Get the highest-revenue products.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}, "limit": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_underperforming_products", "description": "Get products flagged Needs Attention or Critical, ranked by revenue at risk.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}, "limit": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_inventory_risks", "description": "Get products with fewer than 14 days of inventory remaining.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_return_rate_anomalies", "description": "Get products with return rates far above their category benchmark.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_pricing_opportunities", "description": "Get products priced materially above competitor benchmarks.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "get_business_opportunities", "description": "Get the ranked list of detected business opportunities (all types), optionally filtered by severity.",
        "parameters": {"type": "object", "properties": {
            "severity": {"type": "string", "enum": ["Critical", "High", "Medium", "Low"]}, "limit": {"type": "integer"}}},
    }},
    {"type": "function", "function": {
        "name": "compare_periods", "description": "Compare current period KPIs against the previous period of equal length.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
    }},
]


def call_tool(name: str, args: dict, db: Session, engine: Optional[AnalyticsEngine] = None):
    """Executes the tool with the shared cached AnalyticsEngine instance."""
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return {"error": f"Unknown tool {name}"}
    tool_args = dict(args or {})
    tool_args["db"] = db
    tool_args["engine"] = engine
    try:
        return fn(**tool_args)
    except TypeError as e:
        # Fallback if function signature mismatch
        try:
            tool_args.pop("engine", None)
            return fn(**tool_args)
        except Exception as inner_e:
            return {"error": str(inner_e)}