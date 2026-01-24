from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
from shared.database import get_database
from shared.auth import get_current_user
from shared.models import (
    Transaction, TransactionCreate,
    Invoice, InvoiceCreate, InvoiceItem,
    Payment, PaymentCreate
)

router = APIRouter(prefix="/api", tags=["Transactions"])
db = get_database()

# ========== TRANSACTION ROUTES ==========

@router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": transaction_data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if transaction_data.transaction_type in ["sale", "issue"]:
        if item["quantity"] < transaction_data.quantity:
            raise HTTPException(status_code=400, detail="Insufficient quantity")
        new_quantity = item["quantity"] - transaction_data.quantity
        await db.items.update_one({"id": transaction_data.item_id}, {"$set": {"quantity": new_quantity}})
        
        # Create stock ledger entry
        ledger_entry = {
            "id": str(uuid.uuid4()),
            "item_id": item["id"],
            "item_name": item["name"],
            "design_code": item["design_code"],
            "metal_type": item["metal_type"],
            "purity": item["purity"],
            "transaction_type": transaction_data.transaction_type,
            "reference_type": "transaction",
            "reference_id": None,
            "quantity_in": 0,
            "quantity_out": transaction_data.quantity,
            "weight_in": 0,
            "weight_out": item["weight"] * transaction_data.quantity,
            "unit_cost": item["selling_price"],
            "total_value": item["selling_price"] * transaction_data.quantity,
            "running_quantity": new_quantity,
            "running_weight": new_quantity * item["weight"],
            "running_value": new_quantity * item["selling_price"],
            "valuation_method": "weighted_average",
            "notes": transaction_data.notes,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.stock_ledger.insert_one(ledger_entry)
        
    elif transaction_data.transaction_type == "return":
        new_quantity = item["quantity"] + transaction_data.quantity
        await db.items.update_one({"id": transaction_data.item_id}, {"$set": {"quantity": new_quantity}})
        
        ledger_entry = {
            "id": str(uuid.uuid4()),
            "item_id": item["id"],
            "item_name": item["name"],
            "design_code": item["design_code"],
            "metal_type": item["metal_type"],
            "purity": item["purity"],
            "transaction_type": "return",
            "reference_type": "transaction",
            "reference_id": None,
            "quantity_in": transaction_data.quantity,
            "quantity_out": 0,
            "weight_in": item["weight"] * transaction_data.quantity,
            "weight_out": 0,
            "unit_cost": item["selling_price"],
            "total_value": item["selling_price"] * transaction_data.quantity,
            "running_quantity": new_quantity,
            "running_weight": new_quantity * item["weight"],
            "running_value": new_quantity * item["selling_price"],
            "valuation_method": "weighted_average",
            "notes": transaction_data.notes,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.stock_ledger.insert_one(ledger_entry)
    
    transaction = Transaction(**transaction_data.model_dump(), created_by=current_user["id"])
    transaction_dict = transaction.model_dump()
    transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
    await db.transactions.insert_one(transaction_dict)
    
    # Update ledger entry with transaction ID
    await db.stock_ledger.update_one(
        {"id": ledger_entry["id"]},
        {"$set": {"reference_id": transaction.id}}
    )
    
    return transaction

@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for txn in transactions:
        if isinstance(txn["created_at"], str):
            txn["created_at"] = datetime.fromisoformat(txn["created_at"])
    return transactions

@router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if isinstance(transaction["created_at"], str):
        transaction["created_at"] = datetime.fromisoformat(transaction["created_at"])
    return transaction

# ========== INVOICE ROUTES ==========

@router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": invoice_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    subtotal = sum(item.subtotal for item in invoice_data.items)
    cgst_amount = subtotal * (invoice_data.cgst_rate / 100)
    sgst_amount = subtotal * (invoice_data.sgst_rate / 100)
    igst_amount = subtotal * (invoice_data.igst_rate / 100)
    total_gst = cgst_amount + sgst_amount + igst_amount
    total_amount = subtotal + total_gst - invoice_data.discount
    
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.now().year}-{(invoice_count + 1):05d}"
    
    invoice = Invoice(
        invoice_number=invoice_number,
        customer_id=invoice_data.customer_id,
        customer_name=customer["name"],
        customer_contact=customer["contact"],
        customer_address=customer.get("address"),
        customer_gstin=customer.get("gstin"),
        items=invoice_data.items,
        subtotal=subtotal,
        cgst_rate=invoice_data.cgst_rate,
        sgst_rate=invoice_data.sgst_rate,
        igst_rate=invoice_data.igst_rate,
        cgst_amount=cgst_amount,
        sgst_amount=sgst_amount,
        igst_amount=igst_amount,
        total_gst=total_gst,
        discount=invoice_data.discount,
        total_amount=total_amount,
        payment_method=invoice_data.payment_method,
        payment_status=invoice_data.payment_status,
        notes=invoice_data.notes,
        created_by=current_user["id"]
    )
    
    invoice_dict = invoice.model_dump()
    invoice_dict["invoice_date"] = invoice_dict["invoice_date"].isoformat()
    invoice_dict["created_at"] = invoice_dict["created_at"].isoformat()
    
    await db.invoices.insert_one(invoice_dict)
    
    # Update inventory and create ledger entries
    for item in invoice_data.items:
        existing_item = await db.items.find_one({"id": item.item_id}, {"_id": 0})
        if existing_item and existing_item["quantity"] >= item.quantity:
            new_quantity = existing_item["quantity"] - item.quantity
            await db.items.update_one({"id": item.item_id}, {"$set": {"quantity": new_quantity}})
            
            ledger_entry = {
                "id": str(uuid.uuid4()),
                "item_id": existing_item["id"],
                "item_name": existing_item["name"],
                "design_code": existing_item["design_code"],
                "metal_type": existing_item["metal_type"],
                "purity": existing_item["purity"],
                "transaction_type": "sale",
                "reference_type": "invoice",
                "reference_id": invoice.id,
                "quantity_in": 0,
                "quantity_out": item.quantity,
                "weight_in": 0,
                "weight_out": item.weight * item.quantity,
                "unit_cost": item.subtotal / item.quantity if item.quantity > 0 else 0,
                "total_value": item.subtotal,
                "running_quantity": new_quantity,
                "running_weight": new_quantity * existing_item["weight"],
                "running_value": new_quantity * existing_item["selling_price"],
                "valuation_method": "weighted_average",
                "notes": f"Invoice {invoice_number}",
                "created_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.stock_ledger.insert_one(ledger_entry)
    
    return invoice

@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for inv in invoices:
        if isinstance(inv["invoice_date"], str):
            inv["invoice_date"] = datetime.fromisoformat(inv["invoice_date"])
        if isinstance(inv["created_at"], str):
            inv["created_at"] = datetime.fromisoformat(inv["created_at"])
    return invoices

@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice["invoice_date"], str):
        invoice["invoice_date"] = datetime.fromisoformat(invoice["invoice_date"])
    if isinstance(invoice["created_at"], str):
        invoice["created_at"] = datetime.fromisoformat(invoice["created_at"])
    return invoice

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}

# ========== PAYMENT ROUTES ==========

@router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment = Payment(**payment_data.model_dump(), created_by=current_user["id"])
    payment_dict = payment.model_dump()
    payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    
    await db.payments.insert_one(payment_dict)
    
    total_paid = payment_data.amount
    existing_payments = await db.payments.find({"invoice_id": payment_data.invoice_id}, {"_id": 0}).to_list(100)
    for p in existing_payments:
        if p["id"] != payment.id:
            total_paid += p["amount"]
    
    if total_paid >= invoice["total_amount"]:
        await db.invoices.update_one({"id": payment_data.invoice_id}, {"$set": {"payment_status": "paid"}})
    else:
        await db.invoices.update_one({"id": payment_data.invoice_id}, {"$set": {"payment_status": "partial"}})
    
    return payment

@router.get("/payments", response_model=List[Payment])
async def get_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for pmt in payments:
        if isinstance(pmt["payment_date"], str):
            pmt["payment_date"] = datetime.fromisoformat(pmt["payment_date"])
        if isinstance(pmt["created_at"], str):
            pmt["created_at"] = datetime.fromisoformat(pmt["created_at"])
    return payments

@router.get("/invoices/{invoice_id}/payments")
async def get_invoice_payments(invoice_id: str, current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(1000)
    total_paid = sum(p["amount"] for p in payments)
    return {"payments": payments, "total_paid": total_paid}
