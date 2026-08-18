from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS
from app.routers import dashboard, marketplaces, products, opportunities, inventory, copilot, sales

app = FastAPI(
    title="Marketplace Performance Copilot API",
    description="Deterministic analytics + opportunity detection + AI reasoning layer for marketplace operations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(marketplaces.router)
app.include_router(products.router)
app.include_router(opportunities.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(copilot.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Marketplace Performance Copilot API"}


@app.get("/health")
def health():
    return {"status": "healthy"}