from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from shared.database import get_database
from shared.auth import get_current_user
from shared.models import (
    StockLedgerEntry, StockLedgerCreate,
    StockAdjustment, StockAdjustmentCreate, StockAdjustmentItem,
    StockReconciliation, StockReconciliationCreate
)

router = APIRouter(prefix="/api/stock", tags=["Stock Management"])
db = get_database()

# ========== STOCK LEDGER ROUTES ==========

@router.get("/ledger")
async def get_stock_ledger(
    item_id: Optional[str] = None,
    metal_type: Optional[str] = None,
    purity: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get stock ledger entries with filtering"""
    query = {}
    
    if item_id:
        query["item_id"] = item_id
    if metal_type:
        query["metal_type"] = metal_type
    if purity:
        query["purity"] = purity
    if transaction_type:
        query["transaction_type"] = transaction_type
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    skip = (page - 1) * limit
    total = await db.stock_ledger.count_documents(query)
    entries = await db.stock_ledger.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/ledger/item/{item_id}")
async def get_item_stock_ledger(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete stock ledger for a specific item"""
    entries = await db.stock_ledger.find(
        {"item_id": item_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(10000)
    
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {
        "item": item,
        "ledger_entries": entries,
        "total_entries": len(entries)
    }

@router.get("/valuation")
async def get_stock_valuation(
    metal_type: Optional[str] = None,
    purity: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get stock valuation report"""
    query = {}
    if metal_type:
        query["metal_type"] = metal_type
    if purity:
        query["purity"] = purity
    if category_id:
        query["category_id"] = category_id
    
    items = await db.items.find(query, {"_id": 0}).to_list(10000)
    
    total_quantity = 0
    total_weight = 0.0
    total_value = 0.0
    
    # Group by metal type
    metal_summary = {}
    # Group by purity
    purity_summary = {}
    
    valuation_items = []
    
    for item in items:
        quantity = item.get("quantity", 0)
        weight = item.get("weight", 0) * quantity
        value = item.get("selling_price", 0) * quantity
        
        total_quantity += quantity
        total_weight += weight
        total_value += value
        
        # Metal summary
        metal = item.get("metal_type", "Unknown")
        if metal not in metal_summary:
            metal_summary[metal] = {"quantity": 0, "weight": 0.0, "value": 0.0}
        metal_summary[metal]["quantity"] += quantity
        metal_summary[metal]["weight"] += weight
        metal_summary[metal]["value"] += value
        
        # Purity summary
        purity = item.get("purity", "Unknown")
        if purity not in purity_summary:
            purity_summary[purity] = {"quantity": 0, "weight": 0.0, "value": 0.0}
        purity_summary[purity]["quantity"] += quantity
        purity_summary[purity]["weight"] += weight
        purity_summary[purity]["value"] += value
        
        valuation_items.append({
            "item_id": item["id"],
            "name": item["name"],
            "design_code": item["design_code"],
            "metal_type": metal,
            "purity": purity,
            "quantity": quantity,
            "unit_weight": item.get("weight", 0),
            "total_weight": weight,
            "unit_price": item.get("selling_price", 0),
            "total_value": value
        })
    
    return {
        "summary": {
            "total_quantity": total_quantity,
            "total_weight": round(total_weight, 2),
            "total_value": round(total_value, 2),
            "valuation_method": "weighted_average"
        },
        "by_metal": metal_summary,
        "by_purity": purity_summary,
        "items": valuation_items
    }

@router.get("/movement-report")
async def get_stock_movement_report(
    start_date: str,
    end_date: str,
    metal_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get stock movement report for date range"""
    query = {
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    if metal_type:
        query["metal_type"] = metal_type
    
    entries = await db.stock_ledger.find(query, {"_id": 0}).to_list(10000)
    
    # Calculate totals
    total_in_quantity = sum(e.get("quantity_in", 0) for e in entries)
    total_out_quantity = sum(e.get("quantity_out", 0) for e in entries)
    total_in_weight = sum(e.get("weight_in", 0) for e in entries)
    total_out_weight = sum(e.get("weight_out", 0) for e in entries)
    total_in_value = sum(e.get("quantity_in", 0) * e.get("unit_cost", 0) for e in entries)
    total_out_value = sum(e.get("quantity_out", 0) * e.get("unit_cost", 0) for e in entries)
    
    # Group by transaction type
    by_type = {}
    for entry in entries:
        t_type = entry.get("transaction_type", "unknown")
        if t_type not in by_type:
            by_type[t_type] = {"count": 0, "quantity_in": 0, "quantity_out": 0, "value": 0}
        by_type[t_type]["count"] += 1
        by_type[t_type]["quantity_in"] += entry.get("quantity_in", 0)
        by_type[t_type]["quantity_out"] += entry.get("quantity_out", 0)
        by_type[t_type]["value"] += entry.get("total_value", 0)
    
    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_in_quantity": total_in_quantity,
            "total_out_quantity": total_out_quantity,
            "net_quantity": total_in_quantity - total_out_quantity,
            "total_in_weight": round(total_in_weight, 2),
            "total_out_weight": round(total_out_weight, 2),
            "net_weight": round(total_in_weight - total_out_weight, 2),
            "total_in_value": round(total_in_value, 2),
            "total_out_value": round(total_out_value, 2),
            "net_value": round(total_in_value - total_out_value, 2)
        },
        "by_transaction_type": by_type,
        "entries": entries
    }

# ========== STOCK ADJUSTMENT ROUTES ==========

@router.post("/adjustments")
async def create_stock_adjustment(
    adjustment_data: StockAdjustmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new stock adjustment"""
    # Generate adjustment number
    count = await db.stock_adjustments.count_documents({})
    adjustment_number = f"ADJ-{datetime.now().year}-{(count + 1):05d}"
    
    items_list = []
    total_quantity_adjusted = 0
    total_weight_adjusted = 0.0
    total_value_adjusted = 0.0
    
    for item_data in adjustment_data.items:
        item = await db.items.find_one({"id": item_data.item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_data.item_id} not found")
        
        item_entry = item_data.model_dump()
        items_list.append(item_entry)
        
        total_quantity_adjusted += abs(item_data.quantity_difference)
        total_weight_adjusted += abs(item_data.weight_difference)
        total_value_adjusted += abs(item_data.value_difference)
    
    adjustment = StockAdjustment(
        adjustment_number=adjustment_number,
        adjustment_type=adjustment_data.adjustment_type,
        reason=adjustment_data.reason,
        items=items_list,
        total_quantity_adjusted=total_quantity_adjusted,
        total_weight_adjusted=total_weight_adjusted,
        total_value_adjusted=total_value_adjusted,
        notes=adjustment_data.notes,
        created_by=current_user["id"]
    )
    
    adjustment_dict = adjustment.model_dump()
    adjustment_dict["adjustment_date"] = adjustment_dict["adjustment_date"].isoformat()
    adjustment_dict["created_at"] = adjustment_dict["created_at"].isoformat()
    
    await db.stock_adjustments.insert_one(adjustment_dict)
    
    return adjustment

@router.get("/adjustments")
async def get_stock_adjustments(
    status: Optional[str] = None,
    adjustment_type: Optional[str] = None,
    reason: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get all stock adjustments"""
    query = {}
    if status:
        query["status"] = status
    if adjustment_type:
        query["adjustment_type"] = adjustment_type
    if reason:
        query["reason"] = reason
    
    skip = (page - 1) * limit
    total = await db.stock_adjustments.count_documents(query)
    adjustments = await db.stock_adjustments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "adjustments": adjustments,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/adjustments/{adjustment_id}")
async def get_stock_adjustment(
    adjustment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific stock adjustment"""
    adjustment = await db.stock_adjustments.find_one({"id": adjustment_id}, {"_id": 0})
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return adjustment

@router.put("/adjustments/{adjustment_id}/approve")
async def approve_stock_adjustment(
    adjustment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve and apply a stock adjustment"""
    adjustment = await db.stock_adjustments.find_one({"id": adjustment_id}, {"_id": 0})
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    if adjustment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve adjustment with status: {adjustment['status']}")
    
    # Apply adjustments to inventory and create ledger entries
    for item_data in adjustment["items"]:
        item = await db.items.find_one({"id": item_data["item_id"]}, {"_id": 0})
        if item:
            new_quantity = item_data["adjusted_quantity"]
            await db.items.update_one(
                {"id": item_data["item_id"]},
                {"$set": {"quantity": new_quantity}}
            )
            
            # Create ledger entry
            quantity_diff = item_data["quantity_difference"]
            weight_diff = item_data["weight_difference"]
            
            ledger_entry = {
                "id": str(uuid.uuid4()),
                "item_id": item["id"],
                "item_name": item["name"],
                "design_code": item["design_code"],
                "metal_type": item["metal_type"],
                "purity": item["purity"],
                "transaction_type": "adjustment",
                "reference_type": "stock_adjustment",
                "reference_id": adjustment_id,
                "quantity_in": quantity_diff if quantity_diff > 0 else 0,
                "quantity_out": abs(quantity_diff) if quantity_diff < 0 else 0,
                "weight_in": weight_diff if weight_diff > 0 else 0,
                "weight_out": abs(weight_diff) if weight_diff < 0 else 0,
                "unit_cost": item_data["unit_cost"],
                "total_value": abs(item_data["value_difference"]),
                "running_quantity": new_quantity,
                "running_weight": new_quantity * item.get("weight", 0),
                "running_value": new_quantity * item.get("selling_price", 0),
                "valuation_method": "weighted_average",
                "notes": f"Stock adjustment: {adjustment['reason']}",
                "created_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.stock_ledger.insert_one(ledger_entry)
    
    # Update adjustment status
    await db.stock_adjustments.update_one(
        {"id": adjustment_id},
        {"$set": {
            "status": "completed",
            "approved_by": current_user["id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Adjustment approved and applied successfully"}

@router.put("/adjustments/{adjustment_id}/reject")
async def reject_stock_adjustment(
    adjustment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject a stock adjustment"""
    adjustment = await db.stock_adjustments.find_one({"id": adjustment_id}, {"_id": 0})
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    if adjustment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject adjustment with status: {adjustment['status']}")
    
    await db.stock_adjustments.update_one(
        {"id": adjustment_id},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Adjustment rejected"}

# ========== STOCK RECONCILIATION ROUTES ==========

@router.post("/reconciliation")
async def create_stock_reconciliation(
    reconciliation_data: StockReconciliationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new stock reconciliation"""
    count = await db.stock_reconciliations.count_documents({})
    reconciliation_number = f"REC-{datetime.now().year}-{(count + 1):05d}"
    
    items_list = []
    total_discrepancies = 0
    total_value_discrepancy = 0.0
    
    for item_data in reconciliation_data.items:
        item = await db.items.find_one({"id": item_data.get("item_id")}, {"_id": 0})
        if not item:
            continue
        
        system_qty = item.get("quantity", 0)
        physical_qty = item_data.get("physical_quantity", 0)
        difference = physical_qty - system_qty
        value_diff = difference * item.get("selling_price", 0)
        
        item_entry = {
            "item_id": item["id"],
            "item_name": item["name"],
            "design_code": item["design_code"],
            "metal_type": item["metal_type"],
            "purity": item["purity"],
            "system_quantity": system_qty,
            "physical_quantity": physical_qty,
            "difference": difference,
            "unit_price": item.get("selling_price", 0),
            "value_difference": value_diff
        }
        items_list.append(item_entry)
        
        if difference != 0:
            total_discrepancies += 1
            total_value_discrepancy += abs(value_diff)
    
    reconciliation = StockReconciliation(
        reconciliation_number=reconciliation_number,
        items=items_list,
        total_items_counted=len(items_list),
        total_discrepancies=total_discrepancies,
        total_value_discrepancy=total_value_discrepancy,
        notes=reconciliation_data.notes,
        created_by=current_user["id"]
    )
    
    rec_dict = reconciliation.model_dump()
    rec_dict["reconciliation_date"] = rec_dict["reconciliation_date"].isoformat()
    rec_dict["created_at"] = rec_dict["created_at"].isoformat()
    
    await db.stock_reconciliations.insert_one(rec_dict)
    
    return reconciliation

@router.get("/reconciliation")
async def get_stock_reconciliations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get all stock reconciliations"""
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.stock_reconciliations.count_documents(query)
    reconciliations = await db.stock_reconciliations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "reconciliations": reconciliations,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/reconciliation/{reconciliation_id}")
async def get_stock_reconciliation(
    reconciliation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific stock reconciliation"""
    reconciliation = await db.stock_reconciliations.find_one({"id": reconciliation_id}, {"_id": 0})
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    return reconciliation

@router.put("/reconciliation/{reconciliation_id}/complete")
async def complete_stock_reconciliation(
    reconciliation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Complete reconciliation and create adjustments for discrepancies"""
    reconciliation = await db.stock_reconciliations.find_one({"id": reconciliation_id}, {"_id": 0})
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    
    if reconciliation["status"] == "completed":
        raise HTTPException(status_code=400, detail="Reconciliation already completed")
    
    # Create adjustment for items with discrepancies
    adjustment_items = []
    for item in reconciliation["items"]:
        if item["difference"] != 0:
            db_item = await db.items.find_one({"id": item["item_id"]}, {"_id": 0})
            if db_item:
                adjustment_items.append(StockAdjustmentItem(
                    item_id=item["item_id"],
                    item_name=item["item_name"],
                    design_code=item["design_code"],
                    metal_type=item["metal_type"],
                    purity=item["purity"],
                    system_quantity=item["system_quantity"],
                    system_weight=item["system_quantity"] * db_item.get("weight", 0),
                    adjusted_quantity=item["physical_quantity"],
                    adjusted_weight=item["physical_quantity"] * db_item.get("weight", 0),
                    quantity_difference=item["difference"],
                    weight_difference=item["difference"] * db_item.get("weight", 0),
                    unit_cost=item["unit_price"],
                    value_difference=item["value_difference"],
                    reason="Stock reconciliation"
                ))
    
    if adjustment_items:
        adjustment_data = StockAdjustmentCreate(
            adjustment_type="reconciliation",
            reason="count_correction",
            items=adjustment_items,
            notes=f"Auto-generated from reconciliation {reconciliation['reconciliation_number']}"
        )
        
        # Create and auto-approve adjustment
        count = await db.stock_adjustments.count_documents({})
        adjustment_number = f"ADJ-{datetime.now().year}-{(count + 1):05d}"
        
        adjustment = StockAdjustment(
            adjustment_number=adjustment_number,
            adjustment_type="reconciliation",
            reason="count_correction",
            status="completed",
            items=[item.model_dump() for item in adjustment_items],
            total_quantity_adjusted=sum(abs(i.quantity_difference) for i in adjustment_items),
            total_weight_adjusted=sum(abs(i.weight_difference) for i in adjustment_items),
            total_value_adjusted=sum(abs(i.value_difference) for i in adjustment_items),
            notes=f"Auto-generated from reconciliation {reconciliation['reconciliation_number']}",
            approved_by=current_user["id"],
            approved_at=datetime.now(timezone.utc),
            created_by=current_user["id"]
        )
        
        adj_dict = adjustment.model_dump()
        adj_dict["adjustment_date"] = adj_dict["adjustment_date"].isoformat()
        adj_dict["approved_at"] = adj_dict["approved_at"].isoformat() if adj_dict["approved_at"] else None
        adj_dict["created_at"] = adj_dict["created_at"].isoformat()
        
        await db.stock_adjustments.insert_one(adj_dict)
        
        # Apply adjustments to inventory
        for item in adjustment_items:
            await db.items.update_one(
                {"id": item.item_id},
                {"$set": {"quantity": item.adjusted_quantity}}
            )
            
            # Create ledger entry
            db_item = await db.items.find_one({"id": item.item_id}, {"_id": 0})
            if db_item:
                ledger_entry = {
                    "id": str(uuid.uuid4()),
                    "item_id": item.item_id,
                    "item_name": item.item_name,
                    "design_code": item.design_code,
                    "metal_type": item.metal_type,
                    "purity": item.purity,
                    "transaction_type": "adjustment",
                    "reference_type": "reconciliation",
                    "reference_id": reconciliation_id,
                    "quantity_in": item.quantity_difference if item.quantity_difference > 0 else 0,
                    "quantity_out": abs(item.quantity_difference) if item.quantity_difference < 0 else 0,
                    "weight_in": item.weight_difference if item.weight_difference > 0 else 0,
                    "weight_out": abs(item.weight_difference) if item.weight_difference < 0 else 0,
                    "unit_cost": item.unit_cost,
                    "total_value": abs(item.value_difference),
                    "running_quantity": item.adjusted_quantity,
                    "running_weight": item.adjusted_weight,
                    "running_value": item.adjusted_quantity * item.unit_cost,
                    "valuation_method": "weighted_average",
                    "notes": "Stock reconciliation adjustment",
                    "created_by": current_user["id"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.stock_ledger.insert_one(ledger_entry)
    
    # Update reconciliation status
    await db.stock_reconciliations.update_one(
        {"id": reconciliation_id},
        {"$set": {
            "status": "completed",
            "completed_by": current_user["id"],
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Reconciliation completed and adjustments applied"}

# ========== STOCK SUMMARY ROUTES ==========

@router.get("/summary")
async def get_stock_summary(current_user: dict = Depends(get_current_user)):
    """Get overall stock summary"""
    items = await db.items.find({}, {"_id": 0}).to_list(10000)
    
    total_items = len(items)
    total_quantity = sum(item.get("quantity", 0) for item in items)
    total_weight = sum(item.get("weight", 0) * item.get("quantity", 0) for item in items)
    total_value = sum(item.get("selling_price", 0) * item.get("quantity", 0) for item in items)
    
    low_stock_items = [item for item in items if item.get("quantity", 0) <= 5]
    out_of_stock = [item for item in items if item.get("quantity", 0) == 0]
    
    # Metal-wise summary
    metal_summary = {}
    for item in items:
        metal = item.get("metal_type", "Unknown")
        if metal not in metal_summary:
            metal_summary[metal] = {"count": 0, "quantity": 0, "weight": 0, "value": 0}
        metal_summary[metal]["count"] += 1
        metal_summary[metal]["quantity"] += item.get("quantity", 0)
        metal_summary[metal]["weight"] += item.get("weight", 0) * item.get("quantity", 0)
        metal_summary[metal]["value"] += item.get("selling_price", 0) * item.get("quantity", 0)
    
    # Recent adjustments
    recent_adjustments = await db.stock_adjustments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Pending adjustments count
    pending_adjustments = await db.stock_adjustments.count_documents({"status": "pending"})
    
    return {
        "overview": {
            "total_items": total_items,
            "total_quantity": total_quantity,
            "total_weight": round(total_weight, 2),
            "total_value": round(total_value, 2)
        },
        "alerts": {
            "low_stock_count": len(low_stock_items),
            "out_of_stock_count": len(out_of_stock),
            "pending_adjustments": pending_adjustments
        },
        "by_metal": metal_summary,
        "low_stock_items": low_stock_items[:10],
        "recent_adjustments": recent_adjustments
    }
