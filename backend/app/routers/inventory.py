from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Inventory, Product, Marketplace
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine, invalidate_engine_cache

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


class InventoryUpdate(BaseModel):
    product_id: int = Field(..., description="Target Product ID")
    marketplace_id: int = Field(..., description="Target Marketplace ID")
    stock: int = Field(..., ge=0, description="Available stock count")
    incoming_stock: int = Field(0, ge=0, description="Incoming inventory count in transit")
    date: Optional[str] = Field(None, description="Snapshot date YYYY-MM-DD (defaults to today)")


@router.get("/risks")
def get_inventory_risks(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    rows = engine.product_table()
    at_risk = [r for r in rows if r["status"] in ("Critical", "Needs Attention") and r["days_of_stock"] is not None]
    at_risk.sort(key=lambda r: r["days_of_stock"])
    return {"at_risk_products": at_risk, "total": len(at_risk)}


@router.post("", status_code=status.HTTP_200_OK)
def log_inventory_stock(
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
):
    """
    Manually updates or logs inventory stock level for a product on a specific channel.
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

    inv = (
        db.query(Inventory)
        .filter(
            Inventory.product_id == payload.product_id,
            Inventory.marketplace_id == payload.marketplace_id,
            Inventory.date == target_date,
        )
        .first()
    )

    if inv:
        inv.stock = payload.stock
        inv.incoming_stock = payload.incoming_stock
    else:
        inv = Inventory(
            date=target_date,
            product_id=payload.product_id,
            marketplace_id=payload.marketplace_id,
            stock=payload.stock,
            incoming_stock=payload.incoming_stock,
        )
        db.add(inv)

    db.commit()
    invalidate_engine_cache()

    return {
        "message": "Inventory updated successfully",
        "inventory": {
            "product_id": payload.product_id,
            "product_name": prod.name,
            "marketplace_id": payload.marketplace_id,
            "marketplace_name": mkt.name,
            "date": str(target_date),
            "stock": payload.stock,
            "incoming_stock": payload.incoming_stock,
        },
    }