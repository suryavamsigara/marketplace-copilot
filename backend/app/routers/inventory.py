from fastapi import APIRouter, Depends
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/risks")
def get_inventory_risks(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    rows = engine.product_table()
    at_risk = [r for r in rows if r["status"] in ("Critical", "Needs Attention") and r["days_of_stock"] is not None]
    at_risk.sort(key=lambda r: r["days_of_stock"])
    return {"at_risk_products": at_risk, "total": len(at_risk)}