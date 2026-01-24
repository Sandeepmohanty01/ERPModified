# Jewellery ERP - Complete Database Schema Documentation

## Overview

This document provides a detailed database schema for the Jewellery ERP application. The application uses **MongoDB** as the primary database with **13 collections** managing all business entities.

---

## Database Configuration

```
Database Name: jewellery_erp (configurable via DB_NAME env variable)
Connection: MongoDB (configurable via MONGO_URL env variable)
Driver: Motor (async MongoDB driver for Python)
```

---

## Collections Summary

| Collection | Description | Primary Key | Main References |
|------------|-------------|-------------|-----------------|
| `users` | User accounts | `id` (UUID) | `role_id` → roles |
| `roles` | Role definitions with permissions | `id` (UUID) | - |
| `categories` | Product categories | `id` (UUID) | - |
| `items` | Jewellery inventory items | `id` (UUID) | `category_id` → categories |
| `stock_ledger` | Stock movement history | `id` (UUID) | `item_id` → items |
| `stock_adjustments` | Stock adjustment records | `id` (UUID) | `item_id` → items |
| `stock_reconciliations` | Physical count reconciliations | `id` (UUID) | `item_id` → items |
| `transactions` | General transactions | `id` (UUID) | `item_id` → items, `seller_id` → sellers |
| `invoices` | Sales invoices | `id` (UUID) | `customer_id` → customers |
| `payments` | Payment records | `id` (UUID) | `invoice_id` → invoices |
| `expenses` | Expense records | `id` (UUID) | - |
| `customers` | Customer information | `id` (UUID) | - |
| `sellers` | Supplier/vendor information | `id` (UUID) | - |

---

## Detailed Schema Definitions

### 1. Users Collection

Stores user account information for authentication and authorization.

```javascript
{
  "_id": ObjectId,                    // MongoDB auto-generated (excluded in API responses)
  "id": "string (UUID)",              // Primary key - unique identifier
  "email": "string",                  // Email address (unique, used for login)
  "name": "string",                   // Full name of the user
  "password": "string",               // Bcrypt hashed password (12 salt rounds)
  "role_id": "string (UUID)",         // Foreign key → roles.id
  "is_active": "boolean",             // Account status (default: true)
  "created_at": "datetime (ISO)"      // Creation timestamp (UTC)
}

// Indexes:
// - { "email": 1 } (unique)
// - { "id": 1 } (unique)
// - { "role_id": 1 }
```

**Example Document:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "admin@jewellery.com",
  "name": "System Admin",
  "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQ...",
  "role_id": "role-uuid-here",
  "is_active": true,
  "created_at": "2025-01-24T10:30:00.000Z"
}
```

---

### 2. Roles Collection

Defines user roles with granular permissions for each module.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "name": "string",                   // Role name (e.g., "Admin", "Manager", "Staff")
  "description": "string | null",     // Role description
  "permissions": {                    // Nested permissions object
    "dashboard": {
      "view": "boolean"
    },
    "inventory": {
      "view": "boolean",
      "create": "boolean",
      "edit": "boolean",
      "delete": "boolean"
    },
    "stock_ledger": {
      "view": "boolean",
      "export": "boolean"
    },
    "stock_adjustment": {
      "view": "boolean",
      "create": "boolean",
      "approve": "boolean",
      "reject": "boolean"
    },
    "transactions": {
      "view": "boolean",
      "create": "boolean",
      "delete": "boolean"
    },
    "invoices": {
      "view": "boolean",
      "create": "boolean",
      "delete": "boolean"
    },
    "customers": {
      "view": "boolean",
      "create": "boolean",
      "edit": "boolean",
      "delete": "boolean"
    },
    "sellers": {
      "view": "boolean",
      "create": "boolean",
      "edit": "boolean",
      "delete": "boolean"
    },
    "users": {
      "view": "boolean",
      "create": "boolean",
      "edit": "boolean",
      "delete": "boolean"
    },
    "roles": {
      "view": "boolean",
      "create": "boolean",
      "edit": "boolean",
      "delete": "boolean"
    },
    "expenses": {
      "view": "boolean",
      "create": "boolean",
      "delete": "boolean"
    }
  },
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "name": 1 }
```

---

### 3. Categories Collection

Product categories for organizing inventory items.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "name": "string",                   // Category name (e.g., "Rings", "Necklaces", "Earrings")
  "description": "string | null",     // Category description
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "name": 1 }
```

---

### 4. Items Collection (Inventory)

Main inventory collection storing all jewellery items with detailed attributes.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "name": "string",                   // Item name (e.g., "Diamond Solitaire Ring")
  "category_id": "string (UUID)",     // Foreign key → categories.id
  "weight": "float",                  // Weight in grams
  "purity": "string",                 // Purity grade (e.g., "22K", "18K", "14K", "925")
  "metal_type": "string",             // Metal type (e.g., "Gold", "Silver", "Platinum")
  "stone_details": "string | null",   // Stone information (e.g., "1ct Diamond VVS1")
  "design_code": "string",            // Unique design/SKU code (e.g., "GR-2025-001")
  "making_charges": "float",          // Making/labor charges in currency
  "base_price": "float",              // Base material price
  "selling_price": "float",           // Final selling price
  "dimensions": "string | null",      // Dimensions (L x W x H)
  "certification": "string | null",   // Certification (e.g., "GIA", "IGI", "BIS Hallmark")
  "images": ["string"],               // Array of image URLs/base64
  "qr_code": "string",                // Design code for QR lookup
  "qr_code_image": "string",          // Base64 encoded QR code image (PNG)
  "quantity": "integer",              // Current stock quantity (default: 1)
  "status": "string",                 // Status: "available" | "sold" | "reserved"
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "design_code": 1 } (unique)
// - { "category_id": 1 }
// - { "metal_type": 1, "purity": 1 }
// - { "status": 1 }
// - { "quantity": 1 }
```

**Example Document:**
```json
{
  "id": "item-uuid-12345",
  "name": "22K Gold Diamond Ring",
  "category_id": "cat-rings-uuid",
  "weight": 8.5,
  "purity": "22K",
  "metal_type": "Gold",
  "stone_details": "0.5ct Round Brilliant Diamond, VS1 clarity",
  "design_code": "GR-2025-001",
  "making_charges": 8500.00,
  "base_price": 45000.00,
  "selling_price": 55000.00,
  "dimensions": "18mm diameter",
  "certification": "BIS Hallmark",
  "images": [],
  "qr_code": "GR-2025-001",
  "qr_code_image": "data:image/png;base64,iVBORw0KGgo...",
  "quantity": 3,
  "status": "available",
  "created_at": "2025-01-24T10:30:00.000Z"
}
```

---

### 5. Stock Ledger Collection

Maintains complete audit trail of all stock movements with running balances.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "item_id": "string (UUID)",         // Foreign key → items.id
  "item_name": "string",              // Denormalized item name (for reports)
  "design_code": "string",            // Denormalized design code
  "metal_type": "string",             // Denormalized metal type
  "purity": "string",                 // Denormalized purity
  "transaction_type": "string",       // Type: "opening" | "purchase" | "sale" | "adjustment" | "transfer" | "return"
  "reference_type": "string",         // Source: "invoice" | "adjustment" | "transfer" | "opening_stock" | "transaction" | "reconciliation"
  "reference_id": "string | null",    // Reference document ID (invoice_id, adjustment_id, etc.)
  "quantity_in": "integer",           // Quantity added (default: 0)
  "quantity_out": "integer",          // Quantity removed (default: 0)
  "weight_in": "float",               // Weight added in grams (default: 0.0)
  "weight_out": "float",              // Weight removed in grams (default: 0.0)
  "unit_cost": "float",               // Cost per unit at transaction time
  "total_value": "float",             // Total transaction value
  "running_quantity": "integer",      // Running balance - quantity after this entry
  "running_weight": "float",          // Running balance - weight after this entry
  "running_value": "float",           // Running balance - value after this entry
  "valuation_method": "string",       // Method: "weighted_average" | "fifo" | "lifo"
  "notes": "string | null",           // Additional notes
  "created_by": "string (UUID)",      // Foreign key → users.id
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "item_id": 1, "created_at": -1 }
// - { "transaction_type": 1 }
// - { "reference_type": 1, "reference_id": 1 }
// - { "created_at": -1 }
// - { "metal_type": 1, "purity": 1 }
```

---

### 6. Stock Adjustments Collection

Records stock adjustments with approval workflow.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "adjustment_number": "string",      // Auto-generated number (e.g., "ADJ-2025-00001")
  "adjustment_date": "datetime (ISO)",
  "adjustment_type": "string",        // Type: "increase" | "decrease" | "reconciliation"
  "reason": "string",                 // Reason: "damage" | "loss" | "found" | "theft" | "count_correction" | "quality_issue" | "expired" | "other"
  "status": "string",                 // Status: "pending" | "approved" | "rejected" | "completed"
  "items": [{                         // Array of adjusted items
    "item_id": "string (UUID)",
    "item_name": "string",
    "design_code": "string",
    "metal_type": "string",
    "purity": "string",
    "system_quantity": "integer",     // Quantity in system before adjustment
    "system_weight": "float",         // Weight in system before adjustment
    "adjusted_quantity": "integer",   // New quantity after adjustment
    "adjusted_weight": "float",       // New weight after adjustment
    "quantity_difference": "integer", // Difference (can be negative)
    "weight_difference": "float",     // Difference (can be negative)
    "unit_cost": "float",             // Unit cost for value calculation
    "value_difference": "float",      // Total value difference
    "reason": "string | null"         // Item-specific reason
  }],
  "total_quantity_adjusted": "integer",
  "total_weight_adjusted": "float",
  "total_value_adjusted": "float",
  "notes": "string | null",
  "approved_by": "string (UUID) | null",
  "approved_at": "datetime (ISO) | null",
  "created_by": "string (UUID)",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "adjustment_number": 1 } (unique)
// - { "status": 1 }
// - { "created_at": -1 }
```

---

### 7. Stock Reconciliations Collection

Records physical inventory counts compared against system quantities.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "reconciliation_number": "string",  // Auto-generated (e.g., "REC-2025-00001")
  "reconciliation_date": "datetime (ISO)",
  "status": "string",                 // Status: "draft" | "in_progress" | "completed" | "cancelled"
  "items": [{                         // Array of counted items
    "item_id": "string (UUID)",
    "item_name": "string",
    "design_code": "string",
    "metal_type": "string",
    "purity": "string",
    "system_quantity": "integer",     // System quantity at time of count
    "physical_quantity": "integer",   // Actual physical count
    "difference": "integer",          // physical - system (can be negative)
    "unit_price": "float",
    "value_difference": "float"
  }],
  "total_items_counted": "integer",
  "total_discrepancies": "integer",   // Number of items with differences
  "total_value_discrepancy": "float",
  "notes": "string | null",
  "created_by": "string (UUID)",
  "completed_by": "string (UUID) | null",
  "completed_at": "datetime (ISO) | null",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "reconciliation_number": 1 } (unique)
// - { "status": 1 }
// - { "created_at": -1 }
```

---

### 8. Transactions Collection

General transactions for stock in/out operations.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "transaction_type": "string",       // Type: "sale" | "purchase" | "return" | "issue"
  "item_id": "string (UUID)",         // Foreign key → items.id
  "seller_id": "string (UUID) | null",// Foreign key → sellers.id (for purchases)
  "quantity": "integer",              // Transaction quantity
  "amount": "float | null",           // Transaction amount
  "notes": "string | null",
  "created_by": "string (UUID)",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "item_id": 1 }
// - { "transaction_type": 1 }
// - { "created_at": -1 }
```

---

### 9. Invoices Collection

Sales invoices with GST calculations (Indian tax system).

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "invoice_number": "string",         // Auto-generated (e.g., "INV-2025-00001")
  "invoice_date": "datetime (ISO)",
  "customer_id": "string (UUID)",     // Foreign key → customers.id
  "customer_name": "string",          // Denormalized customer name
  "customer_contact": "string",       // Denormalized phone number
  "customer_address": "string | null",
  "customer_gstin": "string | null",  // GST Identification Number
  "items": [{                         // Invoice line items
    "item_id": "string (UUID)",
    "item_name": "string",
    "design_code": "string",
    "hsn_code": "string",             // HSN code (default: "7113" for jewellery)
    "quantity": "integer",
    "weight": "float",
    "purity": "string",
    "metal_type": "string",
    "rate_per_gram": "float",
    "making_charges": "float",
    "stone_charges": "float",
    "subtotal": "float"
  }],
  "subtotal": "float",                // Sum of all item subtotals
  "cgst_rate": "float",               // Central GST rate (default: 1.5%)
  "sgst_rate": "float",               // State GST rate (default: 1.5%)
  "igst_rate": "float",               // Integrated GST rate (default: 0%)
  "cgst_amount": "float",             // Calculated CGST amount
  "sgst_amount": "float",             // Calculated SGST amount
  "igst_amount": "float",             // Calculated IGST amount
  "total_gst": "float",               // Sum of all GST amounts
  "discount": "float",                // Discount amount (default: 0)
  "total_amount": "float",            // Final invoice amount
  "payment_method": "string",         // Method: "cash" | "card" | "upi" | "bank_transfer" | "cheque"
  "payment_status": "string",         // Status: "pending" | "partial" | "paid"
  "notes": "string | null",
  "created_by": "string (UUID)",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "invoice_number": 1 } (unique)
// - { "customer_id": 1 }
// - { "payment_status": 1 }
// - { "created_at": -1 }
```

---

### 10. Payments Collection

Payment records linked to invoices.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "invoice_id": "string (UUID)",      // Foreign key → invoices.id
  "amount": "float",                  // Payment amount
  "payment_method": "string",         // Method: "cash" | "card" | "upi" | "bank_transfer" | "cheque"
  "payment_date": "datetime (ISO)",
  "reference_number": "string | null",// Transaction reference (cheque no, UPI ref, etc.)
  "notes": "string | null",
  "created_by": "string (UUID)",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "invoice_id": 1 }
// - { "payment_date": -1 }
```

---

### 11. Expenses Collection

Business expense tracking.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "category": "string",               // Category: "rent" | "utilities" | "salary" | "marketing" | "maintenance" | "supplies" | "other"
  "description": "string",            // Expense description
  "amount": "float",                  // Expense amount
  "expense_date": "datetime (ISO)",
  "payment_method": "string",         // Method: "cash" | "card" | "upi" | "bank_transfer" | "cheque"
  "notes": "string | null",
  "created_by": "string (UUID)",
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "category": 1 }
// - { "expense_date": -1 }
```

---

### 12. Customers Collection

Customer information for invoicing.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "name": "string",                   // Customer name
  "contact": "string",                // Phone number
  "email": "string | null",           // Email address
  "address": "string | null",         // Full address
  "gstin": "string | null",           // GST Identification Number (for B2B)
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "contact": 1 }
// - { "email": 1 }
```

---

### 13. Sellers Collection

Supplier/vendor information.

```javascript
{
  "_id": ObjectId,
  "id": "string (UUID)",              // Primary key
  "name": "string",                   // Seller/vendor name
  "contact": "string",                // Phone number
  "email": "string | null",           // Email address
  "address": "string | null",         // Full address
  "created_at": "datetime (ISO)"
}

// Indexes:
// - { "id": 1 } (unique)
// - { "contact": 1 }
```

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│    roles     │◄──────│    users     │
│              │  1:N  │              │
└──────────────┘       └──────────────┘
                              │
                              │ created_by (1:N)
                              ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  categories  │◄──────│    items     │──────►│ stock_ledger │
│              │  1:N  │              │  1:N  │              │
└──────────────┘       └──────────────┘       └──────────────┘
                              │                      │
                              │                      │
                              ▼                      ▼
                    ┌──────────────────┐    ┌──────────────────┐
                    │  stock_          │    │  stock_          │
                    │  adjustments     │    │  reconciliations │
                    └──────────────────┘    └──────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  customers   │◄──────│   invoices   │──────►│   payments   │
│              │  1:N  │              │  1:N  │              │
└──────────────┘       └──────────────┘       └──────────────┘

┌──────────────┐       ┌──────────────┐
│   sellers    │◄──────│ transactions │
│              │  1:N  │              │
└──────────────┘       └──────────────┘

┌──────────────┐
│   expenses   │ (standalone)
└──────────────┘
```

---

## Data Types Reference

| Type | MongoDB | Python/Pydantic | Description |
|------|---------|-----------------|-------------|
| UUID | String | str | UUID v4 format |
| Datetime | String (ISO) | datetime | UTC timezone, ISO 8601 format |
| Float | Double | float | Decimal numbers |
| Integer | Int32/Int64 | int | Whole numbers |
| Boolean | Boolean | bool | true/false |
| String | String | str | Text data |
| Array | Array | List | Ordered collection |
| Object | Object | Dict | Nested document |

---

## Recommended MongoDB Indexes

```javascript
// Users
db.users.createIndex({ "id": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role_id": 1 })

// Roles
db.roles.createIndex({ "id": 1 }, { unique: true })

// Categories
db.categories.createIndex({ "id": 1 }, { unique: true })

// Items
db.items.createIndex({ "id": 1 }, { unique: true })
db.items.createIndex({ "design_code": 1 }, { unique: true })
db.items.createIndex({ "category_id": 1 })
db.items.createIndex({ "metal_type": 1, "purity": 1 })
db.items.createIndex({ "status": 1 })

// Stock Ledger
db.stock_ledger.createIndex({ "id": 1 }, { unique: true })
db.stock_ledger.createIndex({ "item_id": 1, "created_at": -1 })
db.stock_ledger.createIndex({ "transaction_type": 1 })
db.stock_ledger.createIndex({ "created_at": -1 })

// Stock Adjustments
db.stock_adjustments.createIndex({ "id": 1 }, { unique: true })
db.stock_adjustments.createIndex({ "adjustment_number": 1 }, { unique: true })
db.stock_adjustments.createIndex({ "status": 1 })

// Invoices
db.invoices.createIndex({ "id": 1 }, { unique: true })
db.invoices.createIndex({ "invoice_number": 1 }, { unique: true })
db.invoices.createIndex({ "customer_id": 1 })
db.invoices.createIndex({ "created_at": -1 })

// Customers
db.customers.createIndex({ "id": 1 }, { unique: true })

// Sellers
db.sellers.createIndex({ "id": 1 }, { unique: true })

// Transactions
db.transactions.createIndex({ "id": 1 }, { unique: true })
db.transactions.createIndex({ "item_id": 1 })
db.transactions.createIndex({ "created_at": -1 })

// Payments
db.payments.createIndex({ "id": 1 }, { unique: true })
db.payments.createIndex({ "invoice_id": 1 })

// Expenses
db.expenses.createIndex({ "id": 1 }, { unique: true })
db.expenses.createIndex({ "expense_date": -1 })
```

---

## Default Data

### Default Admin Role
```json
{
  "name": "Admin",
  "description": "Full system access",
  "permissions": {
    "dashboard": { "view": true },
    "inventory": { "view": true, "create": true, "edit": true, "delete": true },
    "stock_ledger": { "view": true, "export": true },
    "stock_adjustment": { "view": true, "create": true, "approve": true, "reject": true },
    "transactions": { "view": true, "create": true, "delete": true },
    "invoices": { "view": true, "create": true, "delete": true },
    "customers": { "view": true, "create": true, "edit": true, "delete": true },
    "sellers": { "view": true, "create": true, "edit": true, "delete": true },
    "users": { "view": true, "create": true, "edit": true, "delete": true },
    "roles": { "view": true, "create": true, "edit": true, "delete": true },
    "expenses": { "view": true, "create": true, "delete": true }
  }
}
```

### Default Admin User
```json
{
  "email": "admin@jewellery.com",
  "password": "admin123",
  "name": "System Admin"
}
```

---

*Document Version: 1.0*
*Last Updated: January 2025*
