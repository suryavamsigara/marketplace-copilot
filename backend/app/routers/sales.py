from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import SalesDaily, Product, Marketplace
from app.dependencies import invalidate_engine_cache

router = APIRouter(prefix="/api/sales", tags=["sales"])


class SalesEntryCreate(BaseModel):
    product_id: int = Field(..., description="Product ID")
    marketplace_id: int = Field(..., description="Marketplace Channel ID")
    date: Optional[str] = Field(None, description="Sales record date YYYY-MM-DD (defaults to today)")
    orders: int = Field(0, ge=0, description="Order count")
    units_sold: int = Field(0, ge=0, description="Units sold")
    revenue: float = Field(0.0, ge=0, description="Gross revenue (INR)")
    visits: int = Field(0, ge=0, description="Product detail page visits")
    clicks: int = Field(0, ge=0, description="Ad/search clicks")
    impressions: int = Field(0, ge=0, description="Search impressions")
    returns: int = Field(0, ge=0, description="Customer returned units")
    ad_spend: float = Field(0.0, ge=0, description="Ad spend (INR)")


@router.post("", status_code=status.HTTP_201_CREATED)
def record_daily_sales(
    payload: SalesEntryCreate,
    db: Session = Depends(get_db),
):
    """
    Manually inserts or updates a daily sales telemetry record for a product on a marketplace.
    """
    prod = db.query(Product).filter(Product.id == payload.product_id).first()
    if not prod:
        raise HTTPException(404, f"Product #{payload.product_id} not found")

    mkt = db.query(Marketplace).filter(Marketplace.id == payload.marketplace_id).first()
    if not mkt:
        raise HTTPException(404, f"Marketplace #{payload.marketplace_id} not found")

    if payload.date:
        try:
            target_date = date.fromisoformat(payload.date)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Expected YYYY-MM-DD")
    else:
        target_date = date.today()

    calc_revenue = payload.revenue if payload.revenue > 0 else round(payload.units_sold * prod.price, 2)

    entry = (
        db.query(SalesDaily)
        .filter(
            SalesDaily.product_id == payload.product_id,
            SalesDaily.marketplace_id == payload.marketplace_id,
            SalesDaily.date == target_date,
        )
        .first()
    )

    if entry:
        entry.orders += payload.orders
        entry.units_sold += payload.units_sold
        entry.revenue += calc_revenue
        entry.visits += payload.visits
        entry.clicks += payload.clicks
        entry.impressions += payload.impressions
        entry.returns += payload.returns
        entry.ad_spend += payload.ad_spend
    else:
        entry = SalesDaily(
            date=target_date,
            product_id=payload.product_id,
            marketplace_id=payload.marketplace_id,
            orders=payload.orders,
            units_sold=payload.units_sold,
            revenue=calc_revenue,
            visits=payload.visits,
            clicks=payload.clicks,
            impressions=payload.impressions,
            returns=payload.returns,
            ad_spend=payload.ad_spend,
        )
        db.add(entry)

    db.commit()
    invalidate_engine_cache()

    return {
        "message": "Sales record logged successfully",
        "sales": {
            "product_id": payload.product_id,
            "product_name": prod.name,
            "marketplace_id": payload.marketplace_id,
            "marketplace_name": mkt.name,
            "date": str(target_date),
            "orders": entry.orders,
            "units_sold": entry.units_sold,
            "revenue": entry.revenue,
            "returns": entry.returns,
        },
    }
