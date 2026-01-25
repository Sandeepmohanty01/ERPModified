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

# ========== SYNC ROUTES ==========

@router.post("/push")
async def push_changes(sync_request: SyncRequest, current_user: dict = Depends(get_current_user)):
    """Push local changes to server with conflict resolution (last modified wins with server preference)"""
    results = {
        "synced": [],
        "conflicts": [],
        "errors": []
    }
    
    for item in sync_request.items:
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
                    item.data["synced_at"] = datetime.now(timezone.utc).isoformat()
                    item.data["created_at"] = item.data.get("created_at", datetime.now(timezone.utc).isoformat())
                    await collection.insert_one(item.data)
                    results["synced"].append({
                        "document_id": item.document_id,
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
