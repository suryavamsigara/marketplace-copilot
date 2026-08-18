"""
Deterministic analytics engine.

Every business metric shown in the product (revenue, orders, conversion,
return rate, AOV, growth, sales velocity, inventory days, revenue at risk)
is computed HERE in plain Python/Pandas. The AI layer never calculates
metrics - it only reads and explains the numbers this module produces.

Class-Based Architecture:
- Single Source of Truth: Loads sales and inventory data once into a thread-safe in-memory cache.
- Thread-Safe Isolation: Request-scoped instances with separate DB sessions share cached DataFrames.
- High Performance: Sub-millisecond in-memory computations without database session collisions.
"""
import threading
import time
from datetime import date, timedelta
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models.models import SalesDaily, Inventory, Product, Marketplace, Opportunity

# Global thread-safe in-memory dataset cache
_DATA_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 180  # 3 minutes

_GLOBAL_LATEST_DATE: Optional[Tuple[float, date]] = None
_GLOBAL_SALES_DF: Optional[Tuple[float, pd.DataFrame]] = None
_GLOBAL_INV_DF: Optional[Tuple[float, pd.DataFrame]] = None


def invalidate_analytics_cache():
    """Clears the global in-memory dataset cache."""
    global _GLOBAL_LATEST_DATE, _GLOBAL_SALES_DF, _GLOBAL_INV_DF
    with _DATA_LOCK:
        _GLOBAL_LATEST_DATE = None
        _GLOBAL_SALES_DF = None
        _GLOBAL_INV_DF = None


def pct_change(curr: float, prev: float) -> float:
    """Calculate percentage change between current and previous values."""
    if prev in (0, None) or (isinstance(prev, float) and np.isnan(prev)):
        return 0.0 if curr == 0 else 100.0
    return round(((curr - prev) / prev) * 100, 2)


class AnalyticsEngine:
    """
    Analytics engine that evaluates deterministic business metrics.
    Safe for concurrent requests: each instance uses its own DB session,
    while accessing thread-safe cached DataFrames in memory.
    """

    def __init__(
        self,
        db: Session,
        days: int = 30,
        marketplace: Optional[str] = None,
        category: Optional[str] = None,
    ):
        self.db = db
        self.days = max(1, days)
        self.marketplace = marketplace
        self.category = category

        # Instance caches
        self._period: Optional[Tuple[date, date, date, date]] = None
        self._dashboard_summary_cache: Optional[Dict[str, Any]] = None
        self._revenue_trend_cache: Dict[str, List[Dict[str, Any]]] = {}
        self._marketplace_metrics_cache: Optional[List[Dict[str, Any]]] = None
        self._product_table_cache: Optional[List[Dict[str, Any]]] = None

    @property
    def latest_date(self) -> date:
        """Thread-safely cached latest sales date."""
        global _GLOBAL_LATEST_DATE
        now = time.time()
        if _GLOBAL_LATEST_DATE and (now - _GLOBAL_LATEST_DATE[0] < _CACHE_TTL_SECONDS):
            return _GLOBAL_LATEST_DATE[1]

        with _DATA_LOCK:
            if _GLOBAL_LATEST_DATE and (now - _GLOBAL_LATEST_DATE[0] < _CACHE_TTL_SECONDS):
                return _GLOBAL_LATEST_DATE[1]
            d = self.db.query(SalesDaily.date).order_by(SalesDaily.date.desc()).first()
            val = d[0] if d else date.today()
            _GLOBAL_LATEST_DATE = (now, val)
            return val

    @property
    def period(self) -> Tuple[date, date, date, date]:
        """
        Returns (current_start, current_end, previous_start, previous_end).
        """
        if self._period is None:
            end = self.latest_date
            start = end - timedelta(days=self.days - 1)
            prev_end = start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=self.days - 1)
            self._period = (start, end, prev_start, prev_end)
        return self._period

    def get_raw_sales_df(self) -> pd.DataFrame:
        """
        Loads and caches the sales, product, and marketplace dataset spanning
        historical lookback periods. Thread-safe across concurrent requests.
        """
        global _GLOBAL_SALES_DF
        now = time.time()
        if _GLOBAL_SALES_DF and (now - _GLOBAL_SALES_DF[0] < _CACHE_TTL_SECONDS):
            return _GLOBAL_SALES_DF[1]

        with _DATA_LOCK:
            if _GLOBAL_SALES_DF and (now - _GLOBAL_SALES_DF[0] < _CACHE_TTL_SECONDS):
                return _GLOBAL_SALES_DF[1]

            _, end, prev_start, _ = self.period
            # Fetch lookback dataset
            q = (
                self.db.query(
                    SalesDaily.date,
                    SalesDaily.product_id,
                    SalesDaily.marketplace_id,
                    SalesDaily.impressions,
                    SalesDaily.clicks,
                    SalesDaily.visits,
                    SalesDaily.orders,
                    SalesDaily.units_sold,
                    SalesDaily.revenue,
                    SalesDaily.returns,
                    SalesDaily.ad_spend,
                    Product.name.label("product_name"),
                    Product.category,
                    Product.price,
                    Product.cost,
                    Product.sku,
                    Marketplace.name.label("marketplace_name"),
                )
                .join(Product, SalesDaily.product_id == Product.id)
                .join(Marketplace, SalesDaily.marketplace_id == Marketplace.id)
                .filter(SalesDaily.date >= prev_start - timedelta(days=60), SalesDaily.date <= end)
            )
            rows = q.all()
            df = pd.DataFrame(
                rows,
                columns=[
                    "date",
                    "product_id",
                    "marketplace_id",
                    "impressions",
                    "clicks",
                    "visits",
                    "orders",
                    "units_sold",
                    "revenue",
                    "returns",
                    "ad_spend",
                    "product_name",
                    "category",
                    "price",
                    "cost",
                    "sku",
                    "marketplace_name",
                ],
            )
            _GLOBAL_SALES_DF = (now, df)
            return df

    def get_sales_df(
        self,
        start: Optional[date] = None,
        end: Optional[date] = None,
        marketplace: Optional[str] = None,
        category: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Retrieves in-memory filtered sales DataFrame without querying the database.
        """
        df = self.get_raw_sales_df()
        if df.empty:
            return df

        mkt = marketplace or self.marketplace
        cat = category or self.category

        mask = pd.Series(True, index=df.index)
        if start is not None:
            mask &= df["date"] >= start
        if end is not None:
            mask &= df["date"] <= end
        if mkt:
            mask &= df["marketplace_name"] == mkt
        if cat:
            mask &= df["category"] == cat

        return df[mask]

    def get_inventory_df(self, as_of: Optional[date] = None) -> pd.DataFrame:
        """
        Loads the latest inventory snapshot once into thread-safe memory.
        """
        global _GLOBAL_INV_DF
        now = time.time()
        if as_of is None and _GLOBAL_INV_DF and (now - _GLOBAL_INV_DF[0] < _CACHE_TTL_SECONDS):
            return _GLOBAL_INV_DF[1]

        with _DATA_LOCK:
            if as_of is None and _GLOBAL_INV_DF and (now - _GLOBAL_INV_DF[0] < _CACHE_TTL_SECONDS):
                return _GLOBAL_INV_DF[1]

            target_date = as_of
            if target_date is None:
                latest = self.db.query(Inventory.date).order_by(Inventory.date.desc()).first()
                target_date = latest[0] if latest else None

            if target_date is None:
                df = pd.DataFrame(columns=["date", "product_id", "marketplace_id", "stock", "incoming_stock"])
            else:
                q = self.db.query(
                    Inventory.date,
                    Inventory.product_id,
                    Inventory.marketplace_id,
                    Inventory.stock,
                    Inventory.incoming_stock,
                ).filter(Inventory.date == target_date)
                rows = q.all()
                df = pd.DataFrame(
                    rows,
                    columns=["date", "product_id", "marketplace_id", "stock", "incoming_stock"],
                )

            if as_of is None:
                _GLOBAL_INV_DF = (now, df)
            return df

    @staticmethod
    def summarize_kpis(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates aggregate KPI sums and ratios from a slice of sales data."""
        if df.empty:
            return {
                "revenue": 0.0,
                "orders": 0,
                "units_sold": 0,
                "visits": 0,
                "conversion_rate": 0.0,
                "avg_order_value": 0.0,
                "return_rate": 0.0,
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

    def dashboard_summary(self) -> Dict[str, Any]:
        """Calculates period-over-period executive KPI comparison."""
        if self._dashboard_summary_cache is not None:
            return self._dashboard_summary_cache

        start, end, prev_start, prev_end = self.period
        df = self.get_sales_df(marketplace=self.marketplace, category=self.category)

        curr = df[(df["date"] >= start) & (df["date"] <= end)]
        prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]

        curr_k = self.summarize_kpis(curr)
        prev_k = self.summarize_kpis(prev)

        kpis = {}
        for key in ["revenue", "orders", "units_sold", "conversion_rate", "avg_order_value", "return_rate"]:
            kpis[key] = {
                "value": curr_k[key],
                "previous": prev_k[key],
                "change_pct": pct_change(curr_k[key], prev_k[key]),
            }

        result = {
            "period": {"start": str(start), "end": str(end)},
            "previous_period": {"start": str(prev_start), "end": str(prev_end)},
            "kpis": kpis,
        }
        self._dashboard_summary_cache = result
        return result

    def revenue_trend(self, granularity: str = "daily", marketplace: Optional[str] = None) -> List[Dict[str, Any]]:
        """Aggregates revenue and volume over the current period by day or week."""
        mkt = marketplace or self.marketplace
        cache_key = f"{granularity}_{mkt}_{self.category}"
        if cache_key in self._revenue_trend_cache:
            return self._revenue_trend_cache[cache_key]

        start, end, _, _ = self.period
        df = self.get_sales_df(start=start, end=end, marketplace=mkt, category=self.category)
        if df.empty:
            return []

        grp = (
            df.groupby("date")
            .agg(
                revenue=("revenue", "sum"),
                orders=("orders", "sum"),
                units_sold=("units_sold", "sum"),
            )
            .reset_index()
            .sort_values("date")
        )

        if granularity == "weekly":
            grp["date"] = pd.to_datetime(grp["date"])
            grp = grp.set_index("date").resample("W-MON").sum(numeric_only=True).reset_index()

        result = [
            {
                "date": str(r["date"])[:10],
                "revenue": round(float(r["revenue"]), 2),
                "orders": int(r["orders"]),
                "units_sold": int(r["units_sold"]),
            }
            for _, r in grp.iterrows()
        ]
        self._revenue_trend_cache[cache_key] = result
        return result

    def marketplace_metrics(self) -> List[Dict[str, Any]]:
        """Computes comparative benchmarking metrics across all sales channels."""
        if self._marketplace_metrics_cache is not None:
            return self._marketplace_metrics_cache

        start, end, prev_start, prev_end = self.period
        df = self.get_raw_sales_df()
        inv = self.get_inventory_df()

        results = []
        total_curr_revenue = 0.0

        for mkt, sub in df.groupby("marketplace_name"):
            curr = sub[(sub["date"] >= start) & (sub["date"] <= end)]
            prev = sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)]
            curr_k = self.summarize_kpis(curr)
            prev_k = self.summarize_kpis(prev)
            total_curr_revenue += curr_k["revenue"]

            mkt_product_ids = sub["product_id"].unique().tolist()
            mkt_inv = inv[inv["product_id"].isin(mkt_product_ids)] if not inv.empty else inv
            stockout_products = 0

            if not mkt_inv.empty:
                vel = curr.groupby("product_id")["units_sold"].sum() / max(self.days, 1)
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
                "marketplace": str(mkt),
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
            r["revenue_contribution_pct"] = round(
                (r["revenue"] / total_curr_revenue * 100) if total_curr_revenue else 0.0,
                2,
            )

        sorted_results = sorted(results, key=lambda r: r["revenue"], reverse=True)
        self._marketplace_metrics_cache = sorted_results
        return sorted_results

    def marketplace_detail(self, marketplace_name: str) -> Optional[Dict[str, Any]]:
        """
        Ultra-fast single-pass computation of marketplace detail, revenue trend,
        top & worst performing products, and associated opportunities.
        """
        all_mkts = self.marketplace_metrics()
        detail = next((m for m in all_mkts if m["marketplace"] == marketplace_name), None)
        if not detail:
            return None

        # 1. Channel Revenue Trend
        trend = self.revenue_trend(marketplace=marketplace_name)

        # 2. Top & Worst Products directly from in-memory slice
        start, end, _, _ = self.period
        df = self.get_sales_df(start=start, end=end, marketplace=marketplace_name)
        inv = self.get_inventory_df()
        inv_map = inv.groupby("product_id")["stock"].sum().to_dict() if not inv.empty else {}

        prod_list = []
        for pid, sub in df.groupby("product_id"):
            k = self.summarize_kpis(sub)
            stock = inv_map.get(pid, 0)
            velocity = k["units_sold"] / max(self.days, 1)
            dos = round(stock / velocity, 1) if velocity > 0 else None
            status = "Healthy"
            if dos is not None and dos < 7:
                status = "Critical"
            elif dos is not None and dos < 14:
                status = "Needs Attention"

            prod_list.append({
                "product_id": int(pid),
                "sku": str(sub["sku"].iloc[0]),
                "product": str(sub["product_name"].iloc[0]),
                "category": str(sub["category"].iloc[0]),
                "revenue": k["revenue"],
                "units_sold": k["units_sold"],
                "conversion_rate": k["conversion_rate"],
                "days_of_stock": dos,
                "status": status,
            })

        top_products = sorted(prod_list, key=lambda p: p["revenue"], reverse=True)[:5]
        worst_products = sorted(prod_list, key=lambda p: p["revenue"])[:5]

        # 3. Channel Opportunities
        mkt_row = self.db.query(Marketplace.id).filter(Marketplace.name == marketplace_name).first()
        mkt_id = mkt_row[0] if mkt_row else None
        opps = []
        if mkt_id:
            opp_rows = (
                self.db.query(Opportunity.id, Opportunity.opportunity_type, Opportunity.severity, Opportunity.title, Opportunity.score)
                .filter(Opportunity.marketplace_id == mkt_id)
                .order_by(Opportunity.score.desc())
                .limit(5)
                .all()
            )
            opps = [
                {"id": r[0], "type": r[1], "severity": r[2], "title": r[3], "score": float(r[4])}
                for r in opp_rows
            ]

        return {
            "marketplace": detail,
            "revenue_trend": trend,
            "top_products": top_products,
            "worst_products": worst_products,
            "opportunities": opps,
        }

    def product_table(self) -> List[Dict[str, Any]]:
        """Computes catalog SKU table with stock depletion, return rates, and risk status."""
        if self._product_table_cache is not None:
            return self._product_table_cache

        start, end, _, _ = self.period
        df = self.get_sales_df(start=start, end=end, marketplace=self.marketplace, category=self.category)
        if df.empty:
            return []

        inv = self.get_inventory_df()
        inv_map = inv.groupby("product_id")["stock"].sum().to_dict() if not inv.empty else {}

        cat_returns = df.groupby("category")[["returns", "units_sold"]].sum().reset_index()
        cat_return_rates = {
            r["category"]: ((r["returns"] / r["units_sold"] * 100) if r["units_sold"] else 0.0)
            for _, r in cat_returns.iterrows()
        }

        rows = []
        for pid, sub in df.groupby("product_id"):
            k = self.summarize_kpis(sub)
            p_inv = inv_map.get(pid, 0)
            velocity = k["units_sold"] / max(self.days, 1)
            days_of_stock = round(p_inv / velocity, 1) if velocity > 0 else None
            avg_price = float(sub["price"].iloc[0])
            revenue_at_risk = (
                round(velocity * min(days_of_stock or 999, 14) * avg_price, 2)
                if days_of_stock is not None and days_of_stock < 14
                else 0.0
            )

            status = "Healthy"
            if days_of_stock is not None and days_of_stock < 3:
                status = "Critical"
            elif days_of_stock is not None and days_of_stock < 7:
                status = "Critical"
            elif days_of_stock is not None and days_of_stock < 14:
                status = "Needs Attention"

            cat_avg_return = cat_return_rates.get(sub["category"].iloc[0], 0.0)
            if k["return_rate"] > cat_avg_return * 1.8 and k["return_rate"] > 8:
                status = "Critical" if status == "Healthy" else status
            elif k["return_rate"] > cat_avg_return * 1.4:
                status = "Needs Attention" if status == "Healthy" else status

            rows.append({
                "product_id": int(pid),
                "sku": str(sub["sku"].iloc[0]),
                "product": str(sub["product_name"].iloc[0]),
                "category": str(sub["category"].iloc[0]),
                "marketplace": (
                    str(sub["marketplace_name"].iloc[0])
                    if sub["marketplace_name"].nunique() == 1
                    else "Multiple"
                ),
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

        sorted_rows = sorted(rows, key=lambda r: r["revenue"], reverse=True)
        self._product_table_cache = sorted_rows
        return sorted_rows

    def product_detail(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves detailed product unit economics, demand trends, and depletion curve."""
        start, end, _, _ = self.period
        df = self.get_sales_df(start=start, end=end)
        df = df[df["product_id"] == product_id]
        if df.empty:
            return None

        inv_full = self.db.query(Inventory).filter(Inventory.product_id == product_id).all()
        inv_trend = sorted(
            [{"date": str(i.date), "stock": int(i.stock)} for i in inv_full],
            key=lambda x: x["date"],
        )

        daily = (
            df.groupby("date")
            .agg(
                revenue=("revenue", "sum"),
                units_sold=("units_sold", "sum"),
                orders=("orders", "sum"),
                visits=("visits", "sum"),
            )
            .reset_index()
            .sort_values("date")
        )
        daily["conversion_rate"] = np.where(
            daily["visits"] > 0, daily["orders"] / daily["visits"] * 100, 0
        )

        k = self.summarize_kpis(df)
        price = float(df["price"].iloc[0])
        cost = float(df["cost"].iloc[0])
        margin = round(((price - cost) / price) * 100, 2) if price else 0.0
        current_stock = inv_trend[-1]["stock"] if inv_trend else 0
        velocity = k["units_sold"] / max(self.days, 1)
        days_of_stock = round(current_stock / velocity, 1) if velocity > 0 else None
        revenue_at_risk = (
            round(velocity * min(days_of_stock or 999, 14) * price, 2)
            if days_of_stock is not None and days_of_stock < 14
            else 0.0
        )

        return {
            "product_id": product_id,
            "sku": str(df["sku"].iloc[0]),
            "name": str(df["product_name"].iloc[0]),
            "category": str(df["category"].iloc[0]),
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
                {
                    "date": str(r["date"]),
                    "revenue": round(float(r["revenue"]), 2),
                    "units_sold": int(r["units_sold"]),
                    "conversion_rate": round(float(r["conversion_rate"]), 2),
                }
                for _, r in daily.iterrows()
            ],
            "inventory_trend": inv_trend,
        }


# ==============================================================================
# Backward-Compatible Module-Level Functional Interface
# ==============================================================================

def default_period(db: Session, days: int = 30) -> Tuple[date, date, date, date]:
    engine = AnalyticsEngine(db, days=days)
    return engine.period


def latest_data_date(db: Session) -> date:
    engine = AnalyticsEngine(db)
    return engine.latest_date


def sales_df(db: Session, start: Optional[date] = None, end: Optional[date] = None) -> pd.DataFrame:
    engine = AnalyticsEngine(db, days=90)
    return engine.get_sales_df(start=start, end=end)


def inventory_df(db: Session, as_of: Optional[date] = None) -> pd.DataFrame:
    engine = AnalyticsEngine(db)
    return engine.get_inventory_df(as_of=as_of)


def summarize_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    return AnalyticsEngine.summarize_kpis(df)


def dashboard_summary(
    db: Session,
    days: int = 30,
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    return engine.dashboard_summary()


def revenue_trend(
    db: Session,
    days: int = 30,
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    granularity: str = "daily",
) -> List[Dict[str, Any]]:
    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    return engine.revenue_trend(granularity=granularity)


def marketplace_metrics(db: Session, days: int = 30) -> List[Dict[str, Any]]:
    engine = AnalyticsEngine(db, days=days)
    return engine.marketplace_metrics()


def marketplace_detail(db: Session, marketplace_name: str, days: int = 30) -> Optional[Dict[str, Any]]:
    engine = AnalyticsEngine(db, days=days)
    return engine.marketplace_detail(marketplace_name=marketplace_name)


def product_table(
    db: Session,
    days: int = 30,
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    return engine.product_table()


def product_detail(db: Session, product_id: int, days: int = 30) -> Optional[Dict[str, Any]]:
    engine = AnalyticsEngine(db, days=days)
    return engine.product_detail(product_id=product_id)