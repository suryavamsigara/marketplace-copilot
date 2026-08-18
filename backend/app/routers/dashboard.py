from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services import analytics_engine as ae

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return ae.dashboard_summary(db, days=days, marketplace=marketplace, category=category)


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    granularity: str = Query("daily", pattern="^(daily|weekly)$"),
    db: Session = Depends(get_db),
):
    return {"trend": ae.revenue_trend(db, days=days, marketplace=marketplace, category=category, granularity=granularity)}