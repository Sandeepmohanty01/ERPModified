from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

# ========== USER & AUTH MODELS ==========

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    permissions: Dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Dict = Field(default_factory=dict)

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role_id: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role_id: str
    is_active: bool

# ========== CATEGORY MODELS ==========

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

# ========== INVENTORY MODELS ==========

class JewelleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category_id: str
    weight: float
    purity: str
    metal_type: str
    stone_details: Optional[str] = None
    design_code: str
    making_charges: float
    base_price: float
    selling_price: float
    dimensions: Optional[str] = None
    certification: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    qr_code: str
    qr_code_image: str
    quantity: int = 1
    status: str = "available"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JewelleryItemCreate(BaseModel):
    name: str
    category_id: str
    weight: float
    purity: str
    metal_type: str
    stone_details: Optional[str] = None
    design_code: str
    making_charges: float
    base_price: float
    selling_price: float
    dimensions: Optional[str] = None
    certification: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    quantity: int = 1

# ========== STOCK LEDGER MODELS ==========

class StockLedgerEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    design_code: str
    metal_type: str
    purity: str
    transaction_type: str  # opening, purchase, sale, adjustment, transfer, return
    reference_type: str  # invoice, adjustment, transfer, opening_stock
    reference_id: Optional[str] = None
    quantity_in: int = 0
    quantity_out: int = 0
    weight_in: float = 0.0
    weight_out: float = 0.0
    unit_cost: float = 0.0
    total_value: float = 0.0
    running_quantity: int = 0
    running_weight: float = 0.0
    running_value: float = 0.0
    valuation_method: str = "weighted_average"  # fifo, lifo, weighted_average
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockLedgerCreate(BaseModel):
    item_id: str
    transaction_type: str
    reference_type: str
    reference_id: Optional[str] = None
    quantity_in: int = 0
    quantity_out: int = 0
    weight_in: float = 0.0
    weight_out: float = 0.0
    unit_cost: float = 0.0
    notes: Optional[str] = None

# ========== STOCK ADJUSTMENT MODELS ==========

class StockAdjustment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    adjustment_number: str
    adjustment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    adjustment_type: str  # increase, decrease, reconciliation
    reason: str  # damage, loss, found, theft, count_correction, quality_issue, expired, other
    status: str = "pending"  # pending, approved, rejected, completed
    items: List[Dict] = Field(default_factory=list)
    total_quantity_adjusted: int = 0
    total_weight_adjusted: float = 0.0
    total_value_adjusted: float = 0.0
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockAdjustmentItem(BaseModel):
    item_id: str
    item_name: str
    design_code: str
    metal_type: str
    purity: str
    system_quantity: int
    system_weight: float
    adjusted_quantity: int
    adjusted_weight: float
    quantity_difference: int
    weight_difference: float
    unit_cost: float
    value_difference: float
    reason: Optional[str] = None

class StockAdjustmentCreate(BaseModel):
    adjustment_type: str
    reason: str
    items: List[StockAdjustmentItem]
    notes: Optional[str] = None

class StockReconciliation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reconciliation_number: str
    reconciliation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "draft"  # draft, in_progress, completed, cancelled
    items: List[Dict] = Field(default_factory=list)
    total_items_counted: int = 0
    total_discrepancies: int = 0
    total_value_discrepancy: float = 0.0
    notes: Optional[str] = None
    created_by: str
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockReconciliationCreate(BaseModel):
    items: List[Dict]
    notes: Optional[str] = None

# ========== SELLER MODELS ==========

class Seller(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SellerCreate(BaseModel):
    name: str
    contact: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None

# ========== TRANSACTION MODELS ==========

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_type: str
    item_id: str
    seller_id: Optional[str] = None
    quantity: int
    amount: Optional[float] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    transaction_type: str
    item_id: str
    seller_id: Optional[str] = None
    quantity: int
    amount: Optional[float] = None
    notes: Optional[str] = None

# ========== CUSTOMER MODELS ==========

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    contact: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gstin: Optional[str] = None

# ========== INVOICE MODELS ==========

class InvoiceItem(BaseModel):
    item_id: str
    item_name: str
    design_code: str
    hsn_code: str = "7113"
    quantity: int
    weight: float
    purity: str
    metal_type: str
    rate_per_gram: float
    making_charges: float
    stone_charges: float = 0
    subtotal: float

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    customer_id: str
    customer_name: str
    customer_contact: str
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    cgst_rate: float = 1.5
    sgst_rate: float = 1.5
    igst_rate: float = 0
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float
    discount: float = 0
    total_amount: float
    payment_method: str
    payment_status: str = "pending"
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    customer_id: str
    items: List[InvoiceItem]
    discount: float = 0
    cgst_rate: float = 1.5
    sgst_rate: float = 1.5
    igst_rate: float = 0
    payment_method: str
    payment_status: str = "pending"
    notes: Optional[str] = None

# ========== PAYMENT MODELS ==========

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    amount: float
    payment_method: str
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

# ========== EXPENSE MODELS ==========

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    description: str
    amount: float
    expense_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_method: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    payment_method: str
    notes: Optional[str] = None
