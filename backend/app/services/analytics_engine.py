"""
Deterministic analytics engine.

Every business metric shown in the product (revenue, orders, conversion,
return rate, AOV, growth, sales velocity, inventory days, revenue at risk)
is computed HERE in plain Python/Pandas. The AI layer never calculates
metrics - it only reads and explains the numbers this module produces.
"""
from datetime import date, timedelta
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.models import SalesDaily, Inventory, Product, Marketplace, CompetitorPrice

CATEGORY_AVG_RETURN_RATE_FLOOR = 0.03


def sales_df(db: Session, start: date = None, end: date = None) -> pd.DataFrame:
    q = db.query(
        SalesDaily.date, SalesDaily.product_id, SalesDaily.marketplace_id,
        SalesDaily.impressions, SalesDaily.clicks, SalesDaily.visits,
        SalesDaily.orders, SalesDaily.units_sold, SalesDaily.revenue,
        SalesDaily.returns, SalesDaily.ad_spend,
        Product.name.label("product_name"), Product.category, Product.price, Product.cost, Product.sku,
        Marketplace.name.label("marketplace_name"),
    ).join(Product, SalesDaily.product_id == Product.id).join(
        Marketplace, SalesDaily.marketplace_id == Marketplace.id
    )
    if start:
        q = q.filter(SalesDaily.date >= start)
    if end:
        q = q.filter(SalesDaily.date <= end)
    rows = q.all()
    df = pd.DataFrame(rows, columns=[
        "date", "product_id", "marketplace_id", "impressions", "clicks", "visits",
        "orders", "units_sold", "revenue", "returns", "ad_spend",
        "product_name", "category", "price", "cost", "sku", "marketplace_name",
    ])
    return df


def inventory_df(db: Session, as_of: date = None) -> pd.DataFrame:
    q = db.query(
        Inventory.date, Inventory.product_id, Inventory.marketplace_id,
        Inventory.stock, Inventory.incoming_stock,
    )
    rows = q.all()
    df = pd.DataFrame(rows, columns=["date", "product_id", "marketplace_id", "stock", "incoming_stock"])
    if as_of is None and not df.empty:
        as_of = df["date"].max()
    if not df.empty:
        df = df[df["date"] == as_of]
    return df


def latest_data_date(db: Session) -> date:
    d = db.query(SalesDaily.date).order_by(SalesDaily.date.desc()).first()
    return d[0] if d else date.today()


def default_period(db: Session, days: int = 30):
    end = latest_data_date(db)
    start = end - timedelta(days=days - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    return start, end, prev_start, prev_end


def pct_change(curr: float, prev: float) -> float:
    if prev in (0, None) or (isinstance(prev, float) and np.isnan(prev)):
        return 0.0 if curr == 0 else 100.0
    return round(((curr - prev) / prev) * 100, 2)


def summarize_kpis(df: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "revenue": 0, "orders": 0, "units_sold": 0, "conversion_rate": 0,
            "avg_order_value": 0, "return_rate": 0, "visits": 0,
        }
    revenue = float(df["revenue"].sum())
    orders = int(df["orders"].sum())
    units = int(df["units_sold"].sum())
    visits = int(df["visits"].sum())
    returns = int(df["returns"].sum())
    conversion = (orders / visits * 100) if visits else 0.0
    aov = (revenue / orders) if orders else 0.0
    return_rate = (returns / units * 100) if units else 0.0
    return {
        "revenue": round(revenue, 2),
        "orders": orders,
        "units_sold": units,
        "visits": visits,
        "conversion_rate": round(conversion, 2),
        "avg_order_value": round(aov, 2),
        "return_rate": round(return_rate, 2),
    }


def dashboard_summary(db: Session, days: int = 30, marketplace: str = None, category: str = None) -> dict:
    start, end, prev_start, prev_end = default_period(db, days)
    df = sales_df(db, prev_start, end)
    if marketplace:
        df = df[df["marketplace_name"] == marketplace]
    if category:
        df = df[df["category"] == category]

    curr = df[(df["date"] >= start) & (df["date"] <= end)]
    prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]

    curr_k = summarize_kpis(curr)
    prev_k = summarize_kpis(prev)

    kpis = {}
    for key in ["revenue", "orders", "units_sold", "conversion_rate", "avg_order_value", "return_rate"]:
        kpis[key] = {
            "value": curr_k[key],
            "previous": prev_k[key],
            "change_pct": pct_change(curr_k[key], prev_k[key]),
        }

    return {
        "period": {"start": str(start), "end": str(end)},
        "previous_period": {"start": str(prev_start), "end": str(prev_end)},
        "kpis": kpis,
    }


def revenue_trend(db: Session, days: int = 30, marketplace: str = None, category: str = None, granularity: str = "daily") -> list:
    start, end, _, _ = default_period(db, days)
    df = sales_df(db, start, end)
    if marketplace:
        df = df[df["marketplace_name"] == marketplace]
    if category:
        df = df[df["category"] == category]
    if df.empty:
        return []
    grp = df.groupby("date").agg(revenue=("revenue", "sum"), orders=("orders", "sum"), units_sold=("units_sold", "sum")).reset_index()
    grp = grp.sort_values("date")
    if granularity == "weekly":
        grp["date"] = pd.to_datetime(grp["date"])
        grp = grp.set_index("date").resample("W-MON").sum(numeric_only=True).reset_index()
    return [
        {"date": str(r["date"])[:10], "revenue": round(float(r["revenue"]), 2),
         "orders": int(r["orders"]), "units_sold": int(r["units_sold"])}
        for _, r in grp.iterrows()
    ]


def marketplace_metrics(db: Session, days: int = 30) -> list:
    start, end, prev_start, prev_end = default_period(db, days)
    df = sales_df(db, prev_start, end)
    inv = inventory_df(db)

    results = []
    total_curr_revenue = 0
    per_mkt_curr = {}
    for mkt, sub in df.groupby("marketplace_name"):
        curr = sub[(sub["date"] >= start) & (sub["date"] <= end)]
        prev = sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)]
        curr_k = summarize_kpis(curr)
        prev_k = summarize_kpis(prev)
        per_mkt_curr[mkt] = curr_k["revenue"]
        total_curr_revenue += curr_k["revenue"]

        mkt_product_ids = sub["product_id"].unique().tolist()
        mkt_inv = inv[inv["product_id"].isin(mkt_product_ids)] if not inv.empty else inv
        stockout_products = 0
        if not mkt_inv.empty:
            vel = curr.groupby("product_id")["units_sold"].sum() / max(days, 1)
            for pid, stock_row in mkt_inv.groupby("product_id"):
                v = vel.get(pid, 0)
                stock = stock_row["stock"].sum()
                if v > 0 and (stock / v) < 7:
                    stockout_products += 1

        growth = pct_change(curr_k["revenue"], prev_k["revenue"])
        health = "Healthy"
        if growth < -5 or curr_k["return_rate"] > 10:
            health = "Needs Attention"
        if growth < -10 or stockout_products > 3:
            health = "Critical"

        results.append({
            "marketplace": mkt,
            "revenue": curr_k["revenue"],
            "revenue_growth_pct": growth,
            "orders": curr_k["orders"],
            "units_sold": curr_k["units_sold"],
            "conversion_rate": curr_k["conversion_rate"],
            "avg_order_value": curr_k["avg_order_value"],
            "return_rate": curr_k["return_rate"],
            "stockout_risk_products": stockout_products,
            "health": health,
        })

    for r in results:
        r["revenue_contribution_pct"] = round((r["revenue"] / total_curr_revenue * 100) if total_curr_revenue else 0, 2)

    return sorted(results, key=lambda r: r["revenue"], reverse=True)


def product_table(db: Session, days: int = 30, marketplace: str = None, category: str = None) -> list:
    start, end, _, _ = default_period(db, days)
    df = sales_df(db, start, end)
    if marketplace:
        df = df[df["marketplace_name"] == marketplace]
    if category:
        df = df[df["category"] == category]
    if df.empty:
        return []

    inv = inventory_df(db)
    cat_return_rates = df.groupby("category").apply(
        lambda g: (g["returns"].sum() / g["units_sold"].sum() * 100) if g["units_sold"].sum() else 0
    ).to_dict()

    rows = []
    for pid, sub in df.groupby("product_id"):
        k = summarize_kpis(sub)
        p_inv = inv[inv["product_id"] == pid]["stock"].sum() if not inv.empty else 0
        velocity = k["units_sold"] / max(days, 1)
        days_of_stock = round(p_inv / velocity, 1) if velocity > 0 else None
        avg_price = sub["price"].iloc[0]
        revenue_at_risk = round(velocity * min(days_of_stock or 999, 14) * avg_price, 2) if days_of_stock is not None and days_of_stock < 14 else 0.0

        status = "Healthy"
        if days_of_stock is not None and days_of_stock < 7:
            status = "Critical"
        elif days_of_stock is not None and days_of_stock < 14:
            status = "Needs Attention"
        cat_avg_return = cat_return_rates.get(sub["category"].iloc[0], 0)
        if k["return_rate"] > cat_avg_return * 1.8 and k["return_rate"] > 8:
            status = "Critical" if status == "Healthy" else status
        elif k["return_rate"] > cat_avg_return * 1.4:
            status = "Needs Attention" if status == "Healthy" else status

        rows.append({
            "product_id": int(pid),
            "sku": sub["sku"].iloc[0],
            "product": sub["product_name"].iloc[0],
            "category": sub["category"].iloc[0],
            "marketplace": sub["marketplace_name"].iloc[0] if sub["marketplace_name"].nunique() == 1 else "Multiple",
            "revenue": k["revenue"],
            "units_sold": k["units_sold"],
            "conversion_rate": k["conversion_rate"],
            "return_rate": k["return_rate"],
            "category_avg_return_rate": round(cat_avg_return, 2),
            "inventory": int(p_inv),
            "sales_velocity": round(velocity, 2),
            "days_of_stock": days_of_stock,
            "revenue_at_risk": revenue_at_risk,
            "status": status,
        })
    return sorted(rows, key=lambda r: r["revenue"], reverse=True)


def product_detail(db: Session, product_id: int, days: int = 30) -> dict:
    start, end, _, _ = default_period(db, days)
    df = sales_df(db, start, end)
    df = df[df["product_id"] == product_id]
    if df.empty:
        return None
    inv_full = db.query(Inventory).filter(Inventory.product_id == product_id).all()
    inv_trend = sorted(
        [{"date": str(i.date), "stock": i.stock} for i in inv_full],
        key=lambda x: x["date"]
    )

    daily = df.groupby("date").agg(
        revenue=("revenue", "sum"), units_sold=("units_sold", "sum"),
        orders=("orders", "sum"), visits=("visits", "sum"),
    ).reset_index().sort_values("date")
    daily["conversion_rate"] = np.where(daily["visits"] > 0, daily["orders"] / daily["visits"] * 100, 0)

    k = summarize_kpis(df)
    price = float(df["price"].iloc[0])
    cost = float(df["cost"].iloc[0])
    margin = round(((price - cost) / price) * 100, 2) if price else 0
    current_stock = inv_trend[-1]["stock"] if inv_trend else 0
    velocity = k["units_sold"] / max(days, 1)
    days_of_stock = round(current_stock / velocity, 1) if velocity > 0 else None
    revenue_at_risk = round(velocity * min(days_of_stock or 999, 14) * price, 2) if days_of_stock is not None and days_of_stock < 14 else 0.0

    return {
        "product_id": product_id,
        "sku": df["sku"].iloc[0],
        "name": df["product_name"].iloc[0],
        "category": df["category"].iloc[0],
        "price": price,
        "cost": cost,
        "margin_pct": margin,
        "revenue": k["revenue"],
        "units_sold": k["units_sold"],
        "conversion_rate": k["conversion_rate"],
        "return_rate": k["return_rate"],
        "inventory": current_stock,
        "sales_velocity": round(velocity, 2),
        "days_of_stock": days_of_stock,
        "revenue_at_risk": revenue_at_risk,
        "trend": [
            {"date": str(r["date"]), "revenue": round(float(r["revenue"]), 2),
             "units_sold": int(r["units_sold"]), "conversion_rate": round(float(r["conversion_rate"]), 2)}
            for _, r in daily.iterrows()
        ],
        "inventory_trend": inv_trend,
    }