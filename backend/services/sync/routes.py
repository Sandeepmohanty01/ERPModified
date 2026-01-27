from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from backend.shared.database import get_database
from backend.shared.auth import get_current_user

router = APIRouter(prefix="/api/sync", tags=["Offline Sync"])
db = get_database()

# ========== SYNC MODELS ==========

class SyncItem(BaseModel):
    collection: str
    document_id: str
    action: str  # create, update, delete
    data: dict
    local_timestamp: str
    client_id: str

class SyncRequest(BaseModel):
    items: List[SyncItem]
    last_sync_timestamp: Optional[str] = None
    client_id: str

class SyncConflict(BaseModel):
    document_id: str
    collection: str
    local_data: dict
    server_data: dict
    resolution: str  # server_wins, client_wins, merged

# Collection mapping for sync
SYNCABLE_COLLECTIONS = {
    "items": db.items,
    "categories": db.categories,
    "customers": db.customers,
    "sellers": db.sellers,
    "invoices": db.invoices,
    "transactions": db.transactions,
    "expenses": db.expenses,
    "stock_adjustments": db.stock_adjustments
}

# ========== HELPER FUNCTIONS ==========

async def create_stock_ledger_entry(item_data, transaction_type, reference_type, quantity_in=0, quantity_out=0, 
                                     weight_in=0.0, weight_out=0.0, unit_cost=0.0, reference_id=None, 
                                     notes=None, created_by=None):
    """Create a stock ledger entry for inventory tracking"""
    # Get running totals
    last_entry = await db.stock_ledger.find_one(
        {"item_id": item_data["id"]},
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
        "item_id": item_data["id"],
        "item_name": item_data["name"],
        "design_code": item_data["design_code"],
        "metal_type": item_data["metal_type"],
        "purity": item_data["purity"],
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

# ========== SYNC ROUTES ==========

@router.post("/push")
async def push_changes(sync_request: SyncRequest, current_user: dict = Depends(get_current_user)):
    """Push local changes to server with conflict resolution (last modified wins with server preference)"""
    results = {
        "synced": [],
        "conflicts": [],
        "errors": []
    }
    
    print(f"[Sync] Received {len(sync_request.items)} items to sync")
    for item in sync_request.items:
        print(f"[Sync] Item: collection={item.collection}, action={item.action}, doc_id={item.document_id}")
        if item.collection not in SYNCABLE_COLLECTIONS:
            results["errors"].append({
                "document_id": item.document_id,
                "error": f"Collection {item.collection} is not syncable"
            })
            continue
        
        collection = SYNCABLE_COLLECTIONS[item.collection]
        
        try:
            if item.action == "create":
                # Check if document already exists
                existing = await collection.find_one({"id": item.document_id}, {"_id": 0})
                if existing:
                    # Conflict - server has this document
                    server_timestamp = existing.get("updated_at") or existing.get("created_at", "")
                    local_timestamp = item.local_timestamp
                    
                    # Last modified wins with server preference for ties
                    if server_timestamp >= local_timestamp:
                        results["conflicts"].append({
                            "document_id": item.document_id,
                            "collection": item.collection,
                            "resolution": "server_wins",
                            "server_data": existing
                        })
                    else:
                        # Client wins - update server
                        item.data["updated_at"] = datetime.now(timezone.utc).isoformat()
                        item.data["synced_at"] = datetime.now(timezone.utc).isoformat()
                        await collection.update_one({"id": item.document_id}, {"$set": item.data})
                        results["synced"].append({
                            "document_id": item.document_id,
                            "collection": item.collection,
                            "action": "update"
                        })
                else:
                    # New document - insert
                    # If ID is a temp ID, generate a real UUID
                    real_id = item.document_id
                    if item.document_id.startswith('temp_'):
                        real_id = str(uuid.uuid4())
                        print(f"[Sync] Replacing temp ID {item.document_id} with real ID {real_id}")
                        item.data["id"] = real_id
                    
                    item.data["synced_at"] = datetime.now(timezone.utc).isoformat()
                    item.data["created_at"] = item.data.get("created_at", datetime.now(timezone.utc).isoformat())
                    await collection.insert_one(item.data)
                    
                    # Create stock ledger entry for items collection
                    if item.collection == "items":
                        await create_stock_ledger_entry(
                            item_data=item.data,
                            transaction_type="opening",
                            reference_type="opening_stock",
                            quantity_in=item.data.get("quantity", 0),
                            weight_in=item.data.get("weight", 0) * item.data.get("quantity", 0),
                            unit_cost=item.data.get("selling_price", 0),
                            created_by=current_user["id"]
                        )
                    
                    results["synced"].append({
                        "document_id": item.document_id,  # Return original temp ID so frontend can match it
                        "real_id": real_id,  # Also return real ID for frontend to update
                        "collection": item.collection,
                        "action": "create"
                    })
            
            elif item.action == "update":
                existing = await collection.find_one({"id": item.document_id}, {"_id": 0})
                if existing:
                    server_timestamp = existing.get("updated_at") or existing.get("created_at", "")
                    local_timestamp = item.local_timestamp
                    
                    # Last modified wins with server preference
                    if server_timestamp > local_timestamp:
                        results["conflicts"].append({
                            "document_id": item.document_id,
                            "collection": item.collection,
                            "resolution": "server_wins",
                            "server_data": existing
                        })
                    else:
                        item.data["updated_at"] = datetime.now(timezone.utc).isoformat()
                        item.data["synced_at"] = datetime.now(timezone.utc).isoformat()
                        await collection.update_one({"id": item.document_id}, {"$set": item.data})
                        results["synced"].append({
                            "document_id": item.document_id,
                            "collection": item.collection,
                            "action": "update"
                        })
                else:
                    results["errors"].append({
                        "document_id": item.document_id,
                        "error": "Document not found on server"
                    })
            
            elif item.action == "delete":
                result = await collection.delete_one({"id": item.document_id})
                if result.deleted_count > 0:
                    results["synced"].append({
                        "document_id": item.document_id,
                        "collection": item.collection,
                        "action": "delete"
                    })
                else:
                    results["errors"].append({
                        "document_id": item.document_id,
                        "error": "Document not found for deletion"
                    })
                    
        except Exception as e:
            results["errors"].append({
                "document_id": item.document_id,
                "error": str(e)
            })
    
    return {
        "success": True,
        "sync_timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results
    }

@router.get("/pull")
async def pull_changes(
    last_sync: Optional[str] = None,
    collections: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Pull server changes since last sync timestamp"""
    changes = {}
    
    # Parse collections filter
    collection_list = collections.split(",") if collections else list(SYNCABLE_COLLECTIONS.keys())
    
    for coll_name in collection_list:
        if coll_name not in SYNCABLE_COLLECTIONS:
            continue
            
        collection = SYNCABLE_COLLECTIONS[coll_name]
        
        query = {}
        if last_sync:
            query["$or"] = [
                {"created_at": {"$gt": last_sync}},
                {"updated_at": {"$gt": last_sync}},
                {"synced_at": {"$gt": last_sync}}
            ]
        
        # Limit to recently accessed data (last 100 documents by default)
        docs = await collection.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
        
        if docs:
            changes[coll_name] = docs
    
    return {
        "success": True,
        "sync_timestamp": datetime.now(timezone.utc).isoformat(),
        "changes": changes,
        "total_changes": sum(len(docs) for docs in changes.values())
    }

@router.get("/status")
async def get_sync_status(current_user: dict = Depends(get_current_user)):
    """Get current sync status and server timestamp"""
    counts = {}
    for coll_name, collection in SYNCABLE_COLLECTIONS.items():
        counts[coll_name] = await collection.count_documents({})
    
    return {
        "status": "online",
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
        "collections": counts
    }

@router.post("/resolve-conflict")
async def resolve_conflict(
    collection: str,
    document_id: str,
    resolution: str,  # "server" or "client"
    client_data: Optional[dict] = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually resolve a sync conflict"""
    if collection not in SYNCABLE_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")
    
    coll = SYNCABLE_COLLECTIONS[collection]
    
    if resolution == "server":
        # Return server data
        doc = await coll.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"resolution": "server", "data": doc}
    
    elif resolution == "client" and client_data:
        # Update with client data
        client_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        client_data["synced_at"] = datetime.now(timezone.utc).isoformat()
        await coll.update_one({"id": document_id}, {"$set": client_data}, upsert=True)
        return {"resolution": "client", "data": client_data}
    
    raise HTTPException(status_code=400, detail="Invalid resolution or missing client data")
