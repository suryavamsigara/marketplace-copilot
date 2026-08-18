from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Product, Inventory, SalesDaily, Marketplace, Opportunity
from app.services.analytics_engine import AnalyticsEngine
from app.dependencies import get_analytics_engine, invalidate_engine_cache

router = APIRouter(prefix="/api/products", tags=["products"])


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Product display name")
    category: str = Field(..., min_length=1, max_length=50, description="Category (e.g. Running, Lifestyle, Training, Outdoor, Sandals)")
    price: float = Field(..., gt=0, description="Selling price (INR)")
    cost: float = Field(..., gt=0, description="Unit cost (INR)")
    sku: Optional[str] = Field(None, description="Unique SKU code (auto-generated if omitted)")
    launch_date: Optional[str] = Field(None, description="Product launch date YYYY-MM-DD (defaults to today)")
    initial_stock: int = Field(100, ge=0, description="Initial inventory count per channel")
    marketplace_id: Optional[int] = Field(None, description="Optional specific marketplace ID (defaults to all channels)")


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    cost: Optional[float] = Field(None, gt=0)
    sku: Optional[str] = None


@router.get("")
def list_products(
    risk_level: Optional[str] = Query(None, description="Healthy | Needs Attention | Critical"),
    search: Optional[str] = None,
    sort_by: str = Query("revenue"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    engine: AnalyticsEngine = Depends(get_analytics_engine),
):
    rows = engine.product_table()

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
    page_rows = rows[start_i : start_i + page_size]
    return {"products": page_rows, "total": total, "page": page, "page_size": page_size}


@router.get("/{product_id}")
def get_product(
    product_id: int,
    engine: AnalyticsEngine = Depends(get_analytics_engine),
):
    detail = engine.product_detail(product_id=product_id)
    if not detail:
        raise HTTPException(404, "Product not found or no sales data in range")
    return detail


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    """
    Manually creates a new product and initializes stock and baseline telemetry.
    """
    sku = payload.sku
    if not sku:
        prefix = payload.category[:3].upper()
        count = db.query(Product).count() + 1
        sku = f"{prefix}-{count:03d}"

    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(400, f"A product with SKU '{sku}' already exists.")

    today = date.today()
    if payload.launch_date:
        try:
            launch = date.fromisoformat(payload.launch_date)
        except ValueError:
            raise HTTPException(400, "Invalid launch_date format. Expected YYYY-MM-DD")
    else:
        launch = today

    new_prod = Product(
        sku=sku,
        name=payload.name,
        category=payload.category,
        price=payload.price,
        cost=payload.cost,
        launch_date=launch,
    )
    db.add(new_prod)
    db.flush()

    marketplaces = db.query(Marketplace).all()
    if payload.marketplace_id:
        marketplaces = [m for m in marketplaces if m.id == payload.marketplace_id]

    for m in marketplaces:
        inv = Inventory(
            date=today,
            product_id=new_prod.id,
            marketplace_id=m.id,
            stock=payload.initial_stock,
            incoming_stock=0,
        )
        db.add(inv)

        sales = SalesDaily(
            date=today,
            product_id=new_prod.id,
            marketplace_id=m.id,
            impressions=100,
            clicks=10,
            visits=8,
            orders=1,
            units_sold=1,
            revenue=payload.price,
            returns=0,
            ad_spend=round(payload.price * 0.1, 2),
        )
        db.add(sales)

    db.commit()
    db.refresh(new_prod)

    invalidate_engine_cache()

    return {
        "message": "Product created successfully",
        "product": {
            "id": new_prod.id,
            "sku": new_prod.sku,
            "name": new_prod.name,
            "category": new_prod.category,
            "price": new_prod.price,
            "cost": new_prod.cost,
            "launch_date": str(new_prod.launch_date),
        },
    }


@router.put("/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates an existing product's metadata, pricing, or cost.
    """
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(404, "Product not found")

    if payload.name is not None:
        prod.name = payload.name
    if payload.category is not None:
        prod.category = payload.category
    if payload.price is not None:
        prod.price = payload.price
    if payload.cost is not None:
        prod.cost = payload.cost
    if payload.sku is not None:
        existing = db.query(Product).filter(Product.sku == payload.sku, Product.id != product_id).first()
        if existing:
            raise HTTPException(400, f"SKU '{payload.sku}' is already in use.")
        prod.sku = payload.sku

    db.commit()
    db.refresh(prod)
    invalidate_engine_cache()

    return {
        "message": "Product updated successfully",
        "product": {
            "id": prod.id,
            "sku": prod.sku,
            "name": prod.name,
            "category": prod.category,
            "price": prod.price,
            "cost": prod.cost,
        },
    }


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    """
    Deletes a product and its cascading records.
    """
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(404, "Product not found")

    db.query(SalesDaily).filter(SalesDaily.product_id == product_id).delete()
    db.query(Inventory).filter(Inventory.product_id == product_id).delete()
    db.query(Opportunity).filter(Opportunity.product_id == product_id).delete()
    db.delete(prod)
    db.commit()
    invalidate_engine_cache()

    return {"message": f"Product #{product_id} deleted successfully"}