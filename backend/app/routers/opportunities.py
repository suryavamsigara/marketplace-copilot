import json
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.models.models import Opportunity, Product, Marketplace

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


def _serialize_batch(opps: List[Opportunity], db: Session) -> List[Dict[str, Any]]:
    if not opps:
        return []

    # Batch fetch related product and marketplace names in single queries (resolves N+1 latency)
    prod_ids = [o.product_id for o in opps if o.product_id]
    mkt_ids = [o.marketplace_id for o in opps if o.marketplace_id]

    prod_map = {}
    if prod_ids:
        rows = db.query(Product.id, Product.name).filter(Product.id.in_(prod_ids)).all()
        prod_map = {r[0]: r[1] for r in rows}

    mkt_map = {}
    if mkt_ids:
        rows = db.query(Marketplace.id, Marketplace.name).filter(Marketplace.id.in_(mkt_ids)).all()
        mkt_map = {r[0]: r[1] for r in rows}

    results = []
    for o in opps:
        entity = (
            prod_map.get(o.product_id)
            or mkt_map.get(o.marketplace_id)
            or "Business-wide"
        )
        try:
            evidence = json.loads(o.evidence) if isinstance(o.evidence, str) else (o.evidence or [])
        except Exception:
            evidence = [str(o.evidence)]

        results.append({
            "id": o.id,
            "opportunity_type": o.opportunity_type,
            "severity": o.severity,
            "score": float(o.score),
            "title": o.title,
            "entity": entity,
            "product_id": o.product_id,
            "marketplace_id": o.marketplace_id,
            "evidence": evidence,
            "impact": o.impact,
            "recommendation": o.recommendation,
            "confidence": o.confidence,
            "created_at": str(o.created_at),
        })
    return results


@router.get("")
def list_opportunities(
    severity: Optional[str] = None,
    opportunity_type: Optional[str] = None,
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Opportunity)
    if severity and severity != "All":
        q = q.filter(Opportunity.severity == severity)
    if opportunity_type:
        q = q.filter(Opportunity.opportunity_type == opportunity_type)
    if marketplace:
        mkt = db.query(Marketplace).filter(Marketplace.name == marketplace).first()
        q = q.filter(Opportunity.marketplace_id == (mkt.id if mkt else -1))
    if category:
        prod_ids = [p.id for p in db.query(Product.id).filter(Product.category == category).all()]
        q = q.filter(Opportunity.product_id.in_([p[0] for p in prod_ids]))

    total = q.count()
    opps = (
        q.order_by(Opportunity.score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "opportunities": _serialize_batch(opps, db),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{opportunity_id}")
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    o = db.query(Opportunity).get(opportunity_id)
    if not o:
        return {"error": "Opportunity not found"}
    return _serialize_batch([o], db)[0]