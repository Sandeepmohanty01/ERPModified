from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
import qrcode
from io import BytesIO
import base64
from backend.shared.database import get_database
from backend.shared.auth import get_current_user, require_permission
from backend.shared.models import Category, CategoryCreate, JewelleryItem, JewelleryItemCreate

router = APIRouter(prefix="/api", tags=["Inventory"])
db = get_database()

def generate_qr_code(design_code: str, item_id: str) -> str:
    """Generate unique QR code for each design code"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    # QR code contains design code and item ID for uniqueness
    qr_data = f"JEWELLERY-ERP|{design_code}|{item_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#022c22", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{qr_base64}"

# ========== CATEGORY ROUTES ==========

@router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(require_permission("inventory.create"))):
    category = Category(**category_data.model_dump())
    category_dict = category.model_dump()
    category_dict["created_at"] = category_dict["created_at"].isoformat()
    await db.categories.insert_one(category_dict)
    return category

@router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(require_permission("inventory.view"))):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for cat in categories:
        if isinstance(cat["created_at"], str):
            cat["created_at"] = datetime.fromisoformat(cat["created_at"])
    return categories

@router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str, current_user: dict = Depends(require_permission("inventory.view"))):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if isinstance(category["created_at"], str):
        category["created_at"] = datetime.fromisoformat(category["created_at"])
    return category

@router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(require_permission("inventory.update"))):
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_data.model_dump()
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return updated

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_permission("inventory.delete"))):
    items_count = await db.items.count_documents({"category_id": category_id})
    if items_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {items_count} items")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ========== INVENTORY/ITEMS ROUTES ==========

@router.post("/items", response_model=JewelleryItem)
async def create_item(item_data: JewelleryItemCreate, current_user: dict = Depends(require_permission("inventory.create"))):
    # Check for duplicate design code
    existing_design = await db.items.find_one({"design_code": item_data.design_code}, {"_id": 0})
    if existing_design:
        raise HTTPException(status_code=400, detail=f"Item with design code '{item_data.design_code}' already exists")
    
    # Check for duplicate name (case-insensitive)
    existing_name = await db.items.find_one({"name": {"$regex": f"^{item_data.name}$", "$options": "i"}}, {"_id": 0})
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Item with name '{item_data.name}' already exists")
    
    category = await db.categories.find_one({"id": item_data.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    item_dict = item_data.model_dump()
    item_id = str(uuid.uuid4())
    item_dict["id"] = item_id
    # Generate unique QR code based on design code
    item_dict["qr_code"] = item_data.design_code
    item_dict["qr_code_image"] = generate_qr_code(item_data.design_code, item_id)
    item_dict["status"] = "available"
    item_dict["created_at"] = datetime.now(timezone.utc)
    
    item = JewelleryItem(**item_dict)
    
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    await db.items.insert_one(item_dict)
    
    # Create opening stock ledger entry
    await create_stock_ledger_entry(
        item=item_dict,
        transaction_type="opening",
        reference_type="opening_stock",
        quantity_in=item_data.quantity,
        weight_in=item_data.weight * item_data.quantity,
        unit_cost=item_data.selling_price,
        created_by=current_user["id"]
    )
    
    return item

async def create_stock_ledger_entry(item, transaction_type, reference_type, quantity_in=0, quantity_out=0, 
                                     weight_in=0.0, weight_out=0.0, unit_cost=0.0, reference_id=None, 
                                     notes=None, created_by=None):
    # Get running totals
    last_entry = await db.stock_ledger.find_one(
        {"item_id": item["id"]},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if last_entry:
        running_quantity = last_entry["running_quantity"] + quantity_in - quantity_out
        running_weight = last_entry["running_weight"] + weight_in - weight_out
        running_value = last_entry["running_value"] + (quantity_in * unit_cost) - (quantity_out * unit_cost)
    else:
        running_quantity = quantity_in - quantity_out
        running_weight = weight_in - weight_out
        running_value = (quantity_in * unit_cost) - (quantity_out * unit_cost)
    
    total_value = (quantity_in * unit_cost) if quantity_in > 0 else (quantity_out * unit_cost)
    
    ledger_entry = {
        "id": str(uuid.uuid4()),
        "item_id": item["id"],
        "item_name": item["name"],
        "design_code": item["design_code"],
        "metal_type": item["metal_type"],
        "purity": item["purity"],
        "transaction_type": transaction_type,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "quantity_in": quantity_in,
        "quantity_out": quantity_out,
        "weight_in": weight_in,
        "weight_out": weight_out,
        "unit_cost": unit_cost,
        "total_value": total_value,
        "running_quantity": running_quantity,
        "running_weight": running_weight,
        "running_value": running_value,
        "valuation_method": "weighted_average",
        "notes": notes,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stock_ledger.insert_one(ledger_entry)
    return ledger_entry

@router.get("/items", response_model=List[JewelleryItem])
async def get_items(current_user: dict = Depends(require_permission("inventory.view"))):
    items = await db.items.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item["created_at"], str):
            item["created_at"] = datetime.fromisoformat(item["created_at"])
    return items

@router.get("/items/{item_id}", response_model=JewelleryItem)
async def get_item(item_id: str, current_user: dict = Depends(require_permission("inventory.view"))):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if isinstance(item["created_at"], str):
        item["created_at"] = datetime.fromisoformat(item["created_at"])
    return item

@router.put("/items/{item_id}", response_model=JewelleryItem)
async def update_item(item_id: str, item_data: JewelleryItemCreate, current_user: dict = Depends(require_permission("inventory.update"))):
    existing = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check for duplicate design code (excluding current item)
    if item_data.design_code != existing.get("design_code"):
        existing_design = await db.items.find_one(
            {"design_code": item_data.design_code, "id": {"$ne": item_id}}, 
            {"_id": 0}
        )
        if existing_design:
            raise HTTPException(status_code=400, detail=f"Item with design code '{item_data.design_code}' already exists")
    
    # Check for duplicate name (case-insensitive, excluding current item)
    if item_data.name.lower() != existing.get("name", "").lower():
        existing_name = await db.items.find_one(
            {"name": {"$regex": f"^{item_data.name}$", "$options": "i"}, "id": {"$ne": item_id}}, 
            {"_id": 0}
        )
        if existing_name:
            raise HTTPException(status_code=400, detail=f"Item with name '{item_data.name}' already exists")
    
    if item_data.category_id != existing["category_id"]:
        category = await db.categories.find_one({"id": item_data.category_id}, {"_id": 0})
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
    
    update_data = item_data.model_dump()
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return updated

@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(require_permission("inventory.delete"))):
    # Delete the item
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete all stock ledger entries for this item
    await db.stock_ledger.delete_many({"item_id": item_id})
    
    return {"message": "Item deleted successfully"}
