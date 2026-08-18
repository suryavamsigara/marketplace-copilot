from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/api/marketplaces", tags=["marketplaces"])


@router.get("")
def list_marketplaces(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    engine = AnalyticsEngine(db, days=days)
    return {"marketplaces": engine.marketplace_metrics()}


@router.get("/{marketplace_name}")
def get_marketplace(marketplace_name: str, days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    engine = AnalyticsEngine(db, days=days)
    detail = engine.marketplace_detail(marketplace_name=marketplace_name)
    if not detail:
        raise HTTPException(404, f"Marketplace '{marketplace_name}' not found")
    return detail