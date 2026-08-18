from fastapi import APIRouter, Depends, Query
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(engine: AnalyticsEngine = Depends(get_analytics_engine)):
    return engine.dashboard_summary()


@router.get("/trends")
def get_trends(
    granularity: str = Query("daily", pattern="^(daily|weekly)$"),
    engine: AnalyticsEngine = Depends(get_analytics_engine),
):
    return {"trend": engine.revenue_trend(granularity=granularity)}