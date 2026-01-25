from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from backend.shared.database import get_database
from backend.shared.auth import get_current_user
from backend.shared.models import Customer, CustomerCreate, Seller, SellerCreate

router = APIRouter(prefix="/api", tags=["Customers & Sellers"])
db = get_database()

# ========== CUSTOMER ROUTES ==========

@router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = Customer(**customer_data.model_dump())
    customer_dict = customer.model_dump()
    customer_dict["created_at"] = customer_dict["created_at"].isoformat()
    await db.customers.insert_one(customer_dict)
    return customer

@router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for customer in customers:
        if isinstance(customer["created_at"], str):
            customer["created_at"] = datetime.fromisoformat(customer["created_at"])
    return customers

@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer["created_at"], str):
        customer["created_at"] = datetime.fromisoformat(customer["created_at"])
    return customer

@router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_data.model_dump()
    await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return updated

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

# ========== SELLER ROUTES ==========

@router.post("/sellers", response_model=Seller)
async def create_seller(seller_data: SellerCreate, current_user: dict = Depends(get_current_user)):
    seller = Seller(**seller_data.model_dump())
    seller_dict = seller.model_dump()
    seller_dict["created_at"] = seller_dict["created_at"].isoformat()
    await db.sellers.insert_one(seller_dict)
    return seller

@router.get("/sellers", response_model=List[Seller])
async def get_sellers(current_user: dict = Depends(get_current_user)):
    sellers = await db.sellers.find({}, {"_id": 0}).to_list(1000)
    for seller in sellers:
        if isinstance(seller["created_at"], str):
            seller["created_at"] = datetime.fromisoformat(seller["created_at"])
    return sellers

@router.get("/sellers/{seller_id}", response_model=Seller)
async def get_seller(seller_id: str, current_user: dict = Depends(get_current_user)):
    seller = await db.sellers.find_one({"id": seller_id}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    if isinstance(seller["created_at"], str):
        seller["created_at"] = datetime.fromisoformat(seller["created_at"])
    return seller

@router.put("/sellers/{seller_id}", response_model=Seller)
async def update_seller(seller_id: str, seller_data: SellerCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.sellers.find_one({"id": seller_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    update_data = seller_data.model_dump()
    await db.sellers.update_one({"id": seller_id}, {"$set": update_data})
    
    updated = await db.sellers.find_one({"id": seller_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return updated

@router.delete("/sellers/{seller_id}")
async def delete_seller(seller_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sellers.delete_one({"id": seller_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    return {"message": "Seller deleted successfully"}
