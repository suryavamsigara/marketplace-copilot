from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    return engine.dashboard_summary()


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    granularity: str = Query("daily", pattern="^(daily|weekly)$"),
    db: Session = Depends(get_db),
):
    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    return {"trend": engine.revenue_trend(granularity=granularity)}