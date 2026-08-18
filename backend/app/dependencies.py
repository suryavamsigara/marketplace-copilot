"""
FastAPI dependencies for request injection.

Provides request-scoped AnalyticsEngine instances backed by thread-safe shared in-memory data caching.
"""
from typing import Optional
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics_engine import AnalyticsEngine, invalidate_analytics_cache


def get_analytics_engine(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
) -> AnalyticsEngine:
    """
    FastAPI dependency injecting a request-scoped AnalyticsEngine.
    Thread-safe: Each request gets its own DB session, while sharing cached in-memory DataFrames.
    """
    return AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)


def invalidate_engine_cache():
    """Clears global analytics in-memory caches."""
    invalidate_analytics_cache()
