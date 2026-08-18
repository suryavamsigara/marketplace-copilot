from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services import analytics_engine as ae

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products(
    days: int = Query(30, ge=1, le=180),
    marketplace: Optional[str] = None,
    category: Optional[str] = None,
    risk_level: Optional[str] = Query(None, description="Healthy | Needs Attention | Critical"),
    search: Optional[str] = None,
    sort_by: str = Query("revenue"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = ae.product_table(db, days=days, marketplace=marketplace, category=category)
    if risk_level:
        rows = [r for r in rows if r["status"] == risk_level]
    if search:
        s = search.lower()
        rows = [r for r in rows if s in r["product"].lower() or s in r["sku"].lower()]

    reverse = sort_dir == "desc"
    if rows and sort_by in rows[0]:
        rows = sorted(rows, key=lambda r: (r[sort_by] is None, r[sort_by]), reverse=reverse)

    total = len(rows)
    start_i = (page - 1) * page_size
    page_rows = rows[start_i:start_i + page_size]
    return {"products": page_rows, "total": total, "page": page, "page_size": page_size}


@router.get("/{product_id}")
def get_product(product_id: int, days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    detail = ae.product_detail(db, product_id, days=days)
    if not detail:
        raise HTTPException(404, "Product not found or no sales data in range")
    return detail