from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from backend.config import settings
import logging

# Import routers from services
from backend.services.auth.routes import router as auth_router
from backend.services.users.routes import router as users_router
from backend.services.inventory.routes import router as inventory_router
from backend.services.stock.routes import router as stock_router
from backend.services.transactions.routes import router as transactions_router
from backend.services.accounts.routes import router as accounts_router
from backend.services.customers.routes import router as customers_router
from backend.services.sync.routes import router as sync_router
from backend.shared.database import close_database

# Create FastAPI app
app = FastAPI(
    title="Jewellery ERP - Microservices API Gateway",
    description="A comprehensive ERP system for jewellery businesses with microservices architecture",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all service routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(inventory_router)
app.include_router(stock_router)
app.include_router(transactions_router)
app.include_router(accounts_router)
app.include_router(customers_router)
app.include_router(sync_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "architecture": "microservices",
        "services": [
            "auth",
            "users",
            "inventory",
            "stock",
            "transactions",
            "accounts",
            "customers"
        ]
    }

@app.on_event("shutdown")
async def shutdown_db_client():
    close_database()
