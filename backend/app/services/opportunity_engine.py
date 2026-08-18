"""
Opportunity detection engine.

This is a deterministic, rule-based business prioritization system - NOT a
machine learning model. Every opportunity is derived from thresholds and
comparisons applied to the metrics computed in analytics_engine.py.

Opportunity Score = Business Impact x Urgency x Confidence, normalized 0-100.
See README "Opportunity Scoring" section for full methodology.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.services import analytics_engine as ae

CONFIDENCE_WEIGHT = {"High": 1.0, "Medium": 0.75, "Low": 0.5}


def _score(impact_0_1: float, urgency_0_1: float, confidence: str) -> float:
    conf_w = CONFIDENCE_WEIGHT.get(confidence, 0.6)
    raw = max(0, min(1, impact_0_1)) * max(0, min(1, urgency_0_1)) * conf_w
    return round(raw * 100, 1)


def _severity_from_score(score: float) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


def detect_stockout_risks(db: Session, days: int = 30) -> list:
    rows = ae.product_table(db, days=days)
    opps = []
    max_revenue = max([r["revenue"] for r in rows], default=1) or 1
    for r in rows:
        dos = r["days_of_stock"]
        if dos is None:
            continue
        if dos < 14:
            urgency = max(0, min(1, (14 - dos) / 14))
            impact = min(1, r["revenue_at_risk"] / (max_revenue * 0.15 + 1))
            confidence = "High"
            score = _score(impact, urgency, confidence)
            severity = "Critical" if dos < 3 else "High" if dos < 7 else "Medium"
            opps.append({
                "opportunity_type": "stock_out_risk",
                "severity": severity,
                "product_id": r["product_id"],
                "marketplace_id": None,
                "score": score,
                "title": f"{r['product']} — Stock-out risk",
                "evidence": [
                    f"{r['days_of_stock']} days of inventory remaining",
                    f"Sales velocity: {r['sales_velocity']} units/day",
                    f"Current inventory: {r['inventory']} units",
                ],
                "impact": f"Estimated revenue exposure: ₹{r['revenue_at_risk']:,.0f}",
                "recommendation": "Prioritize replenishment before stock depletes.",
                "confidence": confidence,
            })
    return opps


def detect_conversion_declines(db: Session, days: int = 30) -> list:
    start, end, prev_start, prev_end = ae.default_period(db, days)
    df = ae.sales_df(db, prev_start, end)
    if df.empty:
        return []
    opps = []
    for pid, sub in df.groupby("product_id"):
        curr = sub[(sub["date"] >= start) & (sub["date"] <= end)]
        prev = sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)]
        if curr.empty or prev.empty:
            continue
        curr_visits, prev_visits = curr["visits"].sum(), prev["visits"].sum()
        curr_orders, prev_orders = curr["orders"].sum(), prev["orders"].sum()
        if prev_visits == 0 or prev_orders == 0:
            continue
        traffic_change = (curr_visits - prev_visits) / prev_visits
        orders_change = (curr_orders - prev_orders) / prev_orders
        curr_conv = curr_orders / curr_visits if curr_visits else 0
        prev_conv = prev_orders / prev_visits if prev_visits else 0
        conv_change = (curr_conv - prev_conv) / prev_conv if prev_conv else 0

        if traffic_change > 0.1 and orders_change < -0.02 and conv_change < -0.1:
            urgency = min(1, abs(conv_change))
            impact = min(1, (curr["revenue"].sum() / 1) / (df["revenue"].sum() * 0.1 + 1))
            confidence = "Medium"
            score = _score(impact, urgency, confidence)
            opps.append({
                "opportunity_type": "conversion_decline",
                "severity": _severity_from_score(score),
                "product_id": int(pid),
                "marketplace_id": None,
                "score": score,
                "title": f"{sub['product_name'].iloc[0]} — Conversion decline",
                "evidence": [
                    f"Traffic change: {traffic_change*100:+.1f}%",
                    f"Orders change: {orders_change*100:+.1f}%",
                    f"Conversion change: {conv_change*100:+.1f}%",
                ],
                "impact": "High-traffic conversion opportunity — potential lost orders",
                "recommendation": "Review listing content, price competitiveness, ratings/reviews, and product-page experience. Requires investigation to confirm root cause.",
                "confidence": confidence,
            })
    return opps


def detect_return_anomalies(db: Session, days: int = 30) -> list:
    rows = ae.product_table(db, days=days)
    opps = []
    for r in rows:
        cat_avg = r["category_avg_return_rate"] or 0
        if cat_avg <= 0 or r["units_sold"] < 5:
            continue
        ratio = r["return_rate"] / cat_avg if cat_avg else 0
        if ratio >= 1.6 and r["return_rate"] > 8:
            urgency = min(1, (ratio - 1))
            impact = min(1, r["revenue"] / 50000)
            confidence = "High" if r["units_sold"] > 30 else "Medium"
            score = _score(impact, urgency, confidence)
            opps.append({
                "opportunity_type": "return_rate_anomaly",
                "severity": _severity_from_score(score),
                "product_id": r["product_id"],
                "marketplace_id": None,
                "score": score,
                "title": f"{r['product']} — Abnormal return rate",
                "evidence": [
                    f"Product return rate: {r['return_rate']}%",
                    f"Category average: {cat_avg}%",
                    f"Return rate is {ratio:.1f}x category benchmark",
                ],
                "impact": "Elevated returns erode net revenue and increase logistics cost",
                "recommendation": "Investigate customer return reasons, sizing/fit, product expectations, and listing accuracy.",
                "confidence": confidence,
            })
    return opps


def detect_marketplace_declines(db: Session, days: int = 30) -> list:
    mkts = ae.marketplace_metrics(db, days=days)
    opps = []
    for m in mkts:
        if m["revenue_growth_pct"] < -8:
            urgency = min(1, abs(m["revenue_growth_pct"]) / 30)
            impact = min(1, m["revenue_contribution_pct"] / 40)
            confidence = "High"
            score = _score(impact, urgency, confidence)
            opps.append({
                "opportunity_type": "marketplace_decline",
                "severity": _severity_from_score(score),
                "product_id": None,
                "marketplace_id": None,  # resolved by caller via name lookup
                "marketplace_name": m["marketplace"],
                "score": score,
                "title": f"{m['marketplace']} revenue decline",
                "evidence": [
                    f"Revenue change: {m['revenue_growth_pct']:+.1f}% vs previous period",
                    f"Revenue contribution: {m['revenue_contribution_pct']}% of total",
                    f"Conversion rate: {m['conversion_rate']}%",
                ],
                "impact": f"₹{m['revenue']:,.0f} at stake on this channel",
                "recommendation": "Investigate marketplace listing quality, ad spend efficiency, and conversion performance for top SKUs on this channel.",
                "confidence": confidence,
            })
    return opps


def detect_pricing_opportunities(db: Session, days: int = 30) -> list:
    from app.models.models import CompetitorPrice, Product
    start, end, _, _ = ae.default_period(db, days)
    rows = db.query(CompetitorPrice).filter(CompetitorPrice.date >= start, CompetitorPrice.date <= end).all()
    if not rows:
        return []
    latest_by_product = {}
    for r in rows:
        latest_by_product[r.product_id] = r  # last one wins (rows ordered by date asc-ish)

    prod_rows = {r["product_id"]: r for r in ae.product_table(db, days=days)}
    opps = []
    for pid, cp in latest_by_product.items():
        if cp.our_price <= cp.competitor_avg_price * 1.08:
            continue
        prow = prod_rows.get(pid)
        if not prow:
            continue
        price_gap_pct = (cp.our_price - cp.competitor_avg_price) / cp.competitor_avg_price * 100
        conv_declining = prow["status"] in ("Needs Attention", "Critical")
        urgency = min(1, price_gap_pct / 25)
        impact = min(1, prow["revenue"] / 60000)
        confidence = "Medium" if conv_declining else "Low"
        score = _score(impact, urgency, confidence)
        opps.append({
            "opportunity_type": "pricing_competitiveness",
            "severity": _severity_from_score(score),
            "product_id": pid,
            "marketplace_id": None,
            "score": score,
            "title": f"{prow['product']} — Priced above market",
            "evidence": [
                f"Our price: ₹{cp.our_price:,.0f}",
                f"Competitor average: ₹{cp.competitor_avg_price:,.0f}",
                f"Price gap: {price_gap_pct:+.1f}%",
            ],
            "impact": "Potential conversion drag from price positioning",
            "recommendation": "Review pricing competitiveness before making a price change; confirm against margin targets.",
            "confidence": confidence,
        })
    return opps


def detect_excess_inventory(db: Session, days: int = 30) -> list:
    rows = ae.product_table(db, days=days)
    opps = []
    for r in rows:
        dos = r["days_of_stock"]
        if dos is None or dos < 60:
            continue
        urgency = min(1, (dos - 60) / 120)
        impact = min(1, (r["inventory"] * (r["revenue"] / max(r["units_sold"], 1))) / 200000)
        confidence = "High"
        score = _score(impact, urgency, confidence)
        opps.append({
            "opportunity_type": "excess_inventory",
            "severity": _severity_from_score(score),
            "product_id": r["product_id"],
            "marketplace_id": None,
            "score": score,
            "title": f"{r['product']} — Excess inventory",
            "evidence": [
                f"Inventory: {r['inventory']} units",
                f"Daily sales velocity: {r['sales_velocity']} units/day",
                f"Days of stock: {r['days_of_stock']}",
            ],
            "impact": "Capital tied up in slow-moving stock",
            "recommendation": "Evaluate promotions, channel transfer, bundling, or liquidation.",
            "confidence": confidence,
        })
    return opps


def detect_high_traffic_low_orders(db: Session, days: int = 30) -> list:
    """Distinct from conversion_decline: flags products with strong absolute
    traffic but a conversion rate well below the category benchmark, even
    without a period-over-period decline."""
    rows = ae.product_table(db, days=days)
    start, end, _, _ = ae.default_period(db, days)
    df = ae.sales_df(db, start, end)
    if df.empty:
        return []
    cat_conv = df.groupby("category").apply(
        lambda g: (g["orders"].sum() / g["visits"].sum() * 100) if g["visits"].sum() else 0
    ).to_dict()
    opps = []
    for r in rows:
        visits = df[df["product_id"] == r["product_id"]]["visits"].sum()
        cat_avg_conv = cat_conv.get(r["category"], 0)
        if visits > df["visits"].mean() * 1.3 and cat_avg_conv > 0 and r["conversion_rate"] < cat_avg_conv * 0.6:
            urgency = min(1, (cat_avg_conv - r["conversion_rate"]) / max(cat_avg_conv, 0.1))
            impact = min(1, visits / (df["visits"].max() + 1))
            confidence = "Medium"
            score = _score(impact, urgency, confidence)
            opps.append({
                "opportunity_type": "high_traffic_low_orders",
                "severity": _severity_from_score(score),
                "product_id": r["product_id"],
                "marketplace_id": None,
                "score": score,
                "title": f"{r['product']} — High traffic, weak conversion",
                "evidence": [
                    f"Visits: {int(visits):,} (above average)",
                    f"Conversion rate: {r['conversion_rate']}% vs category avg {round(cat_avg_conv,2)}%",
                ],
                "impact": "Traffic is not converting at category-typical rates",
                "recommendation": "Audit product page content, pricing, and reviews; consider A/B testing listing changes.",
                "confidence": confidence,
            })
    return opps


def detect_revenue_concentration(db: Session, days: int = 30) -> list:
    rows = ae.product_table(db, days=days)
    total = sum(r["revenue"] for r in rows) or 1
    top = sorted(rows, key=lambda r: r["revenue"], reverse=True)[:5]
    top_share = sum(r["revenue"] for r in top) / total
    opps = []
    if top_share > 0.35:
        urgency = min(1, (top_share - 0.35) / 0.35)
        impact = 0.7
        confidence = "Medium"
        score = _score(impact, urgency, confidence)
        opps.append({
            "opportunity_type": "revenue_concentration_risk",
            "severity": _severity_from_score(score),
            "product_id": None,
            "marketplace_id": None,
            "score": score,
            "title": "Revenue concentration risk — top 5 SKUs",
            "evidence": [
                f"Top 5 products contribute {top_share*100:.1f}% of total revenue",
                "Top products: " + ", ".join(r["product"] for r in top),
            ],
            "impact": "Business is exposed to demand or supply shocks on a small set of SKUs",
            "recommendation": "Diversify catalog focus and marketing spend; build contingency inventory buffers for top SKUs.",
            "confidence": confidence,
        })
    return opps


def detect_underperformers(db: Session, days: int = 30) -> list:
    rows = ae.product_table(db, days=days)
    opps = []
    if not rows:
        return opps
    avg_rev = sum(r["revenue"] for r in rows) / len(rows)
    for r in rows:
        if r["units_sold"] > 0 and r["revenue"] < avg_rev * 0.15 and r["days_of_stock"] and r["days_of_stock"] < 200:
            score = _score(0.3, 0.4, "Low")
            opps.append({
                "opportunity_type": "underperforming_product",
                "severity": _severity_from_score(score),
                "product_id": r["product_id"],
                "marketplace_id": None,
                "score": score,
                "title": f"{r['product']} — Underperforming",
                "evidence": [
                    f"Revenue: ₹{r['revenue']:,.0f} (well below catalog average of ₹{avg_rev:,.0f})",
                    f"Units sold: {r['units_sold']}",
                ],
                "impact": "Low revenue contribution relative to catalog",
                "recommendation": "Evaluate for promotion, re-merchandising, or catalog rationalization.",
                "confidence": "Low",
            })
    return opps[:8]  # cap noise


def detect_sales_anomalies(db: Session, days: int = 30) -> list:
    start, end, _, _ = ae.default_period(db, days)
    df = ae.sales_df(db, start, end)
    if df.empty:
        return []
    opps = []
    for pid, sub in df.groupby("product_id"):
        daily = sub.groupby("date")["units_sold"].sum().sort_index()
        if len(daily) < 10:
            continue
        recent = daily.tail(5).mean()
        baseline = daily.iloc[:-5].mean()
        if baseline > 3 and recent < baseline * 0.4:
            drop_pct = (recent - baseline) / baseline * 100
            urgency = min(1, abs(drop_pct) / 100)
            impact = min(1, (sub["revenue"].sum()) / 60000)
            confidence = "Medium"
            score = _score(impact, urgency, confidence)
            opps.append({
                "opportunity_type": "sales_anomaly",
                "severity": _severity_from_score(score),
                "product_id": int(pid),
                "marketplace_id": None,
                "score": score,
                "title": f"{sub['product_name'].iloc[0]} — Sudden sales drop",
                "evidence": [
                    f"Recent 5-day average units/day: {recent:.1f}",
                    f"Prior baseline units/day: {baseline:.1f}",
                    f"Change: {drop_pct:+.1f}%",
                ],
                "impact": "Stable product deviating sharply from its baseline demand",
                "recommendation": "Check for listing suppression, stock-outs, price errors, or negative reviews. Requires investigation to confirm cause.",
                "confidence": confidence,
            })
    return opps


def detect_all_opportunities(db: Session, days: int = 30) -> list:
    from app.models.models import Marketplace
    mkt_ids = {m.name: m.id for m in db.query(Marketplace).all()}

    all_opps = []
    all_opps += detect_stockout_risks(db, days)
    all_opps += detect_conversion_declines(db, days)
    all_opps += detect_return_anomalies(db, days)

    mkt_declines = detect_marketplace_declines(db, days)
    for o in mkt_declines:
        o["marketplace_id"] = mkt_ids.get(o.pop("marketplace_name", None))
    all_opps += mkt_declines

    all_opps += detect_pricing_opportunities(db, days)
    all_opps += detect_excess_inventory(db, days)
    all_opps += detect_high_traffic_low_orders(db, days)
    all_opps += detect_revenue_concentration(db, days)
    all_opps += detect_underperformers(db, days)
    all_opps += detect_sales_anomalies(db, days)

    all_opps.sort(key=lambda o: o["score"], reverse=True)
    return all_opps