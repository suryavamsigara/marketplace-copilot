import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import Opportunity, Product, Marketplace

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


def _serialize(o: Opportunity, db: Session) -> dict:
    product_name = None
    marketplace_name = None
    if o.product_id:
        p = db.query(Product).get(o.product_id)
        product_name = p.name if p else None
    if o.marketplace_id:
        m = db.query(Marketplace).get(o.marketplace_id)
        marketplace_name = m.name if m else None
    return {
        "id": o.id,
        "opportunity_type": o.opportunity_type,
        "severity": o.severity,
        "score": o.score,
        "title": o.title,
        "entity": product_name or marketplace_name or "Business-wide",
        "product_id": o.product_id,
        "marketplace_id": o.marketplace_id,
        "evidence": json.loads(o.evidence),
        "impact": o.impact,
        "recommendation": o.recommendation,
        "confidence": o.confidence,
        "created_at": str(o.created_at),
    }


@router.get("")
def list_opportunities(
    severity: Optional[str] = None,
    opportunity_type: Optional[str] = None,
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Opportunity)
    if severity:
        q = q.filter(Opportunity.severity == severity)
    if opportunity_type:
        q = q.filter(Opportunity.opportunity_type == opportunity_type)
    if marketplace:
        mkt = db.query(Marketplace).filter(Marketplace.name == marketplace).first()
        q = q.filter(Opportunity.marketplace_id == (mkt.id if mkt else -1))
    if category:
        prod_ids = [p.id for p in db.query(Product).filter(Product.category == category).all()]
        q = q.filter(Opportunity.product_id.in_(prod_ids))

    opps = q.order_by(Opportunity.score.desc()).all()
    return {"opportunities": [_serialize(o, db) for o in opps], "total": len(opps)}


@router.get("/{opportunity_id}")
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    o = db.query(Opportunity).get(opportunity_id)
    if not o:
        return {"error": "Opportunity not found"}
    return _serialize(o, db)