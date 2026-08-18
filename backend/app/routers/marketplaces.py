from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Marketplace
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine, invalidate_engine_cache

router = APIRouter(prefix="/api/marketplaces", tags=["marketplaces"])


class MarketplaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Marketplace name (e.g. Amazon, Flipkart, Myntra, Ajio, Meesho)")


@router.get("")
def list_marketplaces(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    return {"marketplaces": engine.marketplace_metrics()}


@router.get("/{marketplace_name}")
def get_marketplace(
    marketplace_name: str,
    engine: AnalyticsEngine = Depends(get_analytics_engine),
):
    detail = engine.marketplace_detail(marketplace_name=marketplace_name)
    if not detail:
        raise HTTPException(404, f"Marketplace '{marketplace_name}' not found")
    return detail


@router.post("", status_code=status.HTTP_201_CREATED)
def create_marketplace(
    payload: MarketplaceCreate,
    db: Session = Depends(get_db),
):
    """
    Manually registers a new marketplace sales channel.
    """
    existing = db.query(Marketplace).filter(Marketplace.name == payload.name).first()
    if existing:
        raise HTTPException(400, f"Marketplace '{payload.name}' already exists.")

    new_mkt = Marketplace(name=payload.name)
    db.add(new_mkt)
    db.commit()
    db.refresh(new_mkt)

    invalidate_engine_cache()

    return {
        "message": "Marketplace created successfully",
        "marketplace": {
            "id": new_mkt.id,
            "name": new_mkt.name,
        },
    }