"""
FastAPI dependencies for request injection.

Provides high-performance cached AnalyticsEngine instances across requests.
"""
import time
from typing import Optional, Dict, Tuple
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics_engine import AnalyticsEngine

# Engine Cache: (cache_key) -> (timestamp, AnalyticsEngine)
_engine_cache: Dict[str, Tuple[float, AnalyticsEngine]] = {}
ENGINE_CACHE_TTL = 180  # 3 minutes TTL


def get_analytics_engine(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
) -> AnalyticsEngine:
    """
    FastAPI dependency that returns a cached AnalyticsEngine instance.
    Reuses in-memory DataFrames across requests to eliminate repetitive DB queries.
    """
    now = time.time()
    cache_key = f"{days}_{marketplace or ''}_{category or ''}"

    if cache_key in _engine_cache:
        cached_time, cached_engine = _engine_cache[cache_key]
        if now - cached_time < ENGINE_CACHE_TTL:
            cached_engine.db = db
            return cached_engine

    engine = AnalyticsEngine(db, days=days, marketplace=marketplace, category=category)
    _engine_cache[cache_key] = (now, engine)
    return engine


def invalidate_engine_cache():
    """Clears cached AnalyticsEngine instances."""
    _engine_cache.clear()
