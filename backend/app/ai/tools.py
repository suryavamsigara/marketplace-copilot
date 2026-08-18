"""
Essential AI Copilot Tools.

Consolidated into 4 high-density, essential tools to eliminate tool-calling bloat,
reduce latency, and ensure maximum token efficiency.
"""
import json
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.services.analytics_engine import AnalyticsEngine
from app.models.models import Opportunity, Product, Marketplace


def get_executive_overview(days: int = 30, db: Optional[Session] = None, engine: Optional[AnalyticsEngine] = None) -> Dict[str, Any]:
    """
    Comprehensive executive summary: overall period-over-period KPIs,
    marketplace channel share, and revenue momentum trend in a single call.
    """
    eng = engine or AnalyticsEngine(db, days=days)
    summary = eng.dashboard_summary()
    marketplaces = eng.marketplace_metrics()
    trend = eng.revenue_trend(granularity="daily")

    return {
        "period": summary.get("period"),
        "kpis": summary.get("kpis"),
        "channel_breakdown": marketplaces,
        "recent_trend": trend[-14:] if len(trend) > 14 else trend,
    }


def get_marketplace_performance(marketplace: str, days: int = 30, db: Optional[Session] = None, engine: Optional[AnalyticsEngine] = None) -> Dict[str, Any]:
    """
    Deep-dive intelligence for a specific selling channel (Amazon, Myntra, Flipkart, Ajio),
    including channel growth, conversion, return rate, top SKUs, and underperforming SKUs.
    """
    eng = engine or AnalyticsEngine(db, days=days)
    detail = eng.marketplace_detail(marketplace_name=marketplace)
    if not detail:
        return {"error": f"Marketplace '{marketplace}' not found"}
    return detail


def get_product_intelligence(
    query: Optional[str] = None,
    risk_status: Optional[str] = None,
    limit: int = 10,
    days: int = 30,
    db: Optional[Session] = None,
    engine: Optional[AnalyticsEngine] = None,
) -> Dict[str, Any]:
    """
    Retrieves SKU analytics. If query is given (name or SKU), returns full unit economics,
    margin, velocity, and stock depletion. Otherwise returns filtered product list (e.g. Critical stockouts).
    """
    eng = engine or AnalyticsEngine(db, days=days)

    if query:
        # Search by SKU or product name
        rows = eng.product_table()
        q_clean = query.strip().lower()
        match = next(
            (r for r in rows if q_clean in r["product"].lower() or q_clean in r["sku"].lower()),
            None,
        )
        if match:
            detail = eng.product_detail(product_id=match["product_id"])
            if detail:
                return {"product": detail}
        return {"error": f"Product '{query}' not found"}

    # Filter by risk status or top revenue
    rows = eng.product_table()
    if risk_status and risk_status != "All":
        rows = [r for r in rows if r["status"].lower() == risk_status.lower()]

    return {
        "count": len(rows),
        "products": rows[:limit],
    }


def get_prioritized_opportunities(
    severity: Optional[str] = None,
    opportunity_type: Optional[str] = None,
    limit: int = 10,
    db: Optional[Session] = None,
    engine: Optional[AnalyticsEngine] = None,
) -> Dict[str, Any]:
    """
    Retrieves prioritized business opportunities (stockout risks, pricing gaps, return anomalies,
    excess inventory, conversion drops) with evidence and recommended actions.
    """
    if db is None and engine is not None:
        db = engine.db

    q = db.query(Opportunity)
    if severity and severity != "All":
        q = q.filter(Opportunity.severity == severity)
    if opportunity_type:
        q = q.filter(Opportunity.opportunity_type == opportunity_type)

    opps = q.order_by(Opportunity.score.desc()).limit(limit).all()
    if not opps:
        return {"opportunities": []}

    prod_ids = [o.product_id for o in opps if o.product_id]
    mkt_ids = [o.marketplace_id for o in opps if o.marketplace_id]

    prod_map = (
        {p.id: p.name for p in db.query(Product.id, Product.name).filter(Product.id.in_(prod_ids)).all()}
        if prod_ids
        else {}
    )
    mkt_map = (
        {m.id: m.name for m in db.query(Marketplace.id, Marketplace.name).filter(Marketplace.id.in_(mkt_ids)).all()}
        if mkt_ids
        else {}
    )

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
            "impact": o.impact,
            "recommendation": o.recommendation,
            "confidence": o.confidence,
        })
    return {"opportunities": result}


TOOL_REGISTRY = {
    "get_executive_overview": get_executive_overview,
    "get_marketplace_performance": get_marketplace_performance,
    "get_product_intelligence": get_product_intelligence,
    "get_prioritized_opportunities": get_prioritized_opportunities,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_executive_overview",
            "description": "Get high-level business performance: overall KPIs (revenue, orders, conversion, AOV, return rate with % changes), marketplace breakdown, and daily trend in ONE call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Lookback window in days (default: 30)"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_marketplace_performance",
            "description": "Get deep-dive diagnostic for a specific marketplace channel (Amazon, Myntra, Flipkart, Ajio), including revenue growth, top SKUs, and underperforming SKUs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "marketplace": {"type": "string", "description": "Name of the channel: Amazon | Myntra | Flipkart | Ajio"},
                    "days": {"type": "integer", "description": "Lookback window in days (default: 30)"},
                },
                "required": ["marketplace"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_intelligence",
            "description": "Lookup SKU unit economics and inventory depletion for a specific product, or list top/at-risk products across the catalog.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "SKU code or product name to look up specifically (e.g. 'Air Runner 200')"},
                    "risk_status": {"type": "string", "enum": ["Critical", "Needs Attention", "Healthy"], "description": "Filter products by health status (e.g. Critical for stockouts)"},
                    "limit": {"type": "integer", "description": "Max number of products to return (default: 10)"},
                    "days": {"type": "integer", "description": "Lookback window in days (default: 30)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_prioritized_opportunities",
            "description": "Get prioritized operational issues and revenue opportunities (stockout risks, pricing gaps, return rate anomalies, excess inventory, sales drops) ranked by score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": ["Critical", "High", "Medium", "Low"], "description": "Filter by urgency severity"},
                    "opportunity_type": {"type": "string", "description": "Filter by type (e.g. stock_out_risk, pricing_competitiveness, return_rate_anomaly)"},
                    "limit": {"type": "integer", "description": "Max opportunities to return (default: 10)"},
                },
            },
        },
    },
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
        tool_args.pop("engine", None)
        try:
            return fn(**tool_args)
        except Exception as inner_e:
            return {"error": str(inner_e)}