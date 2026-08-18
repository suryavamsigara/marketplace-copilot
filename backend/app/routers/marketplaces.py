from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import analytics_engine as ae
from app.models.models import Marketplace

router = APIRouter(prefix="/api/marketplaces", tags=["marketplaces"])


@router.get("")
def list_marketplaces(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    return {"marketplaces": ae.marketplace_metrics(db, days=days)}


@router.get("/{marketplace_name}")
def get_marketplace(marketplace_name: str, days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    mkt = db.query(Marketplace).filter(Marketplace.name == marketplace_name).first()
    if not mkt:
        raise HTTPException(404, "Marketplace not found")

    all_mkts = ae.marketplace_metrics(db, days=days)
    detail = next((m for m in all_mkts if m["marketplace"] == marketplace_name), None)
    trend = ae.revenue_trend(db, days=days, marketplace=marketplace_name)
    products = [p for p in ae.product_table(db, days=days) if p["marketplace"] in (marketplace_name, "Multiple")]
    top_products = sorted(products, key=lambda p: p["revenue"], reverse=True)[:5]
    worst_products = sorted(products, key=lambda p: p["revenue"])[:5]

    from app.models.models import Opportunity
    opps = db.query(Opportunity).filter(Opportunity.marketplace_id == mkt.id).order_by(Opportunity.score.desc()).limit(5).all()

    return {
        "marketplace": detail,
        "revenue_trend": trend,
        "top_products": top_products,
        "worst_products": worst_products,
        "opportunities": [
            {"id": o.id, "type": o.opportunity_type, "severity": o.severity, "title": o.title, "score": o.score}
            for o in opps
        ],
    }