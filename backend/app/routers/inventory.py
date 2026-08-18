from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import analytics_engine as ae

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/risks")
def get_inventory_risks(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    rows = ae.product_table(db, days=days)
    at_risk = [r for r in rows if r["status"] in ("Critical", "Needs Attention") and r["days_of_stock"] is not None]
    at_risk.sort(key=lambda r: r["days_of_stock"])
    return {"at_risk_products": at_risk, "total": len(at_risk)}