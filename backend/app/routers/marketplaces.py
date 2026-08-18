from fastapi import APIRouter, Depends, HTTPException
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine

router = APIRouter(prefix="/api/marketplaces", tags=["marketplaces"])


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