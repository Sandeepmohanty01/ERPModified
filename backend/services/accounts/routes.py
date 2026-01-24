from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from shared.database import get_database
from shared.auth import get_current_user
from shared.models import Expense, ExpenseCreate

router = APIRouter(prefix="/api", tags=["Accounts"])
db = get_database()

# ========== EXPENSE ROUTES ==========

@router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense = Expense(**expense_data.model_dump(), created_by=current_user["id"])
    expense_dict = expense.model_dump()
    expense_dict["expense_date"] = expense_dict["expense_date"].isoformat()
    expense_dict["created_at"] = expense_dict["created_at"].isoformat()
    await db.expenses.insert_one(expense_dict)
    return expense

@router.get("/expenses", response_model=List[Expense])
async def get_expenses(current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for exp in expenses:
        if isinstance(exp["expense_date"], str):
            exp["expense_date"] = datetime.fromisoformat(exp["expense_date"])
        if isinstance(exp["created_at"], str):
            exp["created_at"] = datetime.fromisoformat(exp["created_at"])
    return expenses

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# ========== ACCOUNTING REPORTS ==========

@router.get("/accounts/summary")
async def get_account_summary(current_user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0, "total_amount": 1, "payment_status": 1}).to_list(10000)
    total_revenue = sum(inv["total_amount"] for inv in invoices)
    paid_revenue = sum(inv["total_amount"] for inv in invoices if inv["payment_status"] == "paid")
    pending_revenue = total_revenue - paid_revenue
    
    expenses = await db.expenses.find({}, {"_id": 0, "amount": 1}).to_list(10000)
    total_expenses = sum(exp["amount"] for exp in expenses)
    
    profit = paid_revenue - total_expenses
    
    payments = await db.payments.find({}, {"_id": 0, "payment_method": 1, "amount": 1}).to_list(10000)
    payment_methods = {}
    for pmt in payments:
        method = pmt["payment_method"]
        payment_methods[method] = payment_methods.get(method, 0) + pmt["amount"]
    
    return {
        "total_revenue": total_revenue,
        "paid_revenue": paid_revenue,
        "pending_revenue": pending_revenue,
        "total_expenses": total_expenses,
        "profit": profit,
        "payment_methods": payment_methods,
        "total_invoices": len(invoices),
        "paid_invoices": sum(1 for inv in invoices if inv["payment_status"] == "paid"),
        "pending_invoices": sum(1 for inv in invoices if inv["payment_status"] in ["pending", "partial"])
    }

# ========== DASHBOARD STATS ==========

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_items = await db.items.count_documents({})
    total_categories = await db.categories.count_documents({})
    total_sellers = await db.sellers.count_documents({})
    total_users = await db.users.count_documents({})
    
    items = await db.items.find({}, {"_id": 0, "quantity": 1, "selling_price": 1}).to_list(10000)
    total_quantity = sum(item["quantity"] for item in items)
    total_value = sum(item["quantity"] * item["selling_price"] for item in items)
    
    low_stock_items = await db.items.find({"quantity": {"$lte": 10}}, {"_id": 0}).to_list(100)
    
    recent_transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for txn in recent_transactions:
        if isinstance(txn["created_at"], str):
            txn["created_at"] = datetime.fromisoformat(txn["created_at"])
    
    # Stock alerts
    pending_adjustments = await db.stock_adjustments.count_documents({"status": "pending"})
    
    return {
        "total_items": total_items,
        "total_categories": total_categories,
        "total_sellers": total_sellers,
        "total_users": total_users,
        "total_quantity": total_quantity,
        "total_value": total_value,
        "low_stock_items": low_stock_items,
        "recent_transactions": recent_transactions,
        "pending_adjustments": pending_adjustments
    }
