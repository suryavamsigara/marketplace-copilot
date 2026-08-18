from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    launch_date = Column(Date, nullable=False)

    sales = relationship("SalesDaily", back_populates="product")
    inventory = relationship("Inventory", back_populates="product")


class Marketplace(Base):
    __tablename__ = "marketplaces"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    sales = relationship("SalesDaily", back_populates="marketplace")


class SalesDaily(Base):
    __tablename__ = "sales_daily"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    visits = Column(Integer, default=0)
    orders = Column(Integer, default=0)
    units_sold = Column(Integer, default=0)
    revenue = Column(Float, default=0)
    returns = Column(Integer, default=0)
    ad_spend = Column(Float, default=0)

    product = relationship("Product", back_populates="sales")
    marketplace = relationship("Marketplace", back_populates="sales")

    __table_args__ = (
        Index("ix_sales_date_product_mkt", "date", "product_id", "marketplace_id"),
    )


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    stock = Column(Integer, default=0)
    incoming_stock = Column(Integer, default=0)

    product = relationship("Product", back_populates="inventory")


class CompetitorPrice(Base):
    __tablename__ = "competitor_prices"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    our_price = Column(Float, nullable=False)
    competitor_avg_price = Column(Float, nullable=False)
    competitor_min_price = Column(Float, nullable=False)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True)
    opportunity_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)  # Critical/High/Medium/Low
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=True, index=True)
    score = Column(Float, nullable=False)
    title = Column(String, nullable=False)
    evidence = Column(Text, nullable=False)  # JSON-encoded list of evidence strings
    impact = Column(String, nullable=True)
    recommendation = Column(Text, nullable=False)
    confidence = Column(String, nullable=False)  # High/Medium/Low
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    marketplace = relationship("Marketplace")