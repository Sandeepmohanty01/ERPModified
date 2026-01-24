# Jewellery ERP - Product Requirements Document

## Original Problem Statement
User requested to:
1. Clone and scan the GitHub repo: https://github.com/Sandeepmohanty01/NewERP
2. Run the application
3. Provide detailed database schema documentation
4. Add offline data storage feature with automatic sync when internet is available

## User Choices
- **Offline Storage Scope**: Only recently accessed/modified data (option c)
- **Sync Strategy**: Last modified wins with server preference for conflict resolution
- **Priority**: First document schema and run app, then add offline sync

## Architecture

### Tech Stack
- **Backend**: FastAPI (Python 3.11) with microservices architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Database**: MongoDB (motor async driver)
- **Authentication**: JWT with bcrypt password hashing
- **Offline Storage**: IndexedDB (frontend) + Sync API (backend)

### Microservices Structure
```
backend/
├── server.py                 # API Gateway
├── shared/                   # Shared utilities
│   ├── auth.py              # JWT authentication
│   ├── database.py          # MongoDB connection
│   └── models.py            # Pydantic schemas
└── services/
    ├── auth/                # Authentication Service
    ├── users/               # Users & Roles Service
    ├── inventory/           # Inventory Service
    ├── stock/               # Stock Management Service
    ├── transactions/        # Transactions Service
    ├── accounts/            # Accounts Service
    ├── customers/           # Customers Service
    └── sync/                # NEW: Offline Sync Service
```

## Database Schema (13 Collections)

| Collection | Purpose |
|------------|---------|
| users | User accounts |
| roles | Role definitions with permissions |
| categories | Product categories |
| items | Jewellery inventory items |
| stock_ledger | Stock movement history |
| stock_adjustments | Stock adjustment records |
| stock_reconciliations | Physical count reconciliations |
| transactions | General transactions |
| invoices | Sales invoices with GST |
| payments | Payment records |
| expenses | Expense records |
| customers | Customer information |
| sellers | Supplier/vendor information |

**Full schema documentation available at**: `/app/docs/DATABASE_SCHEMA.md`

## What's Been Implemented (January 2025)

### ✅ Repository Cloned & Running
- Cloned NewERP repository
- Set up MongoDB, backend (port 8001), frontend (port 3000)
- Created seed data with admin user

### ✅ Database Schema Documentation
- Created comprehensive schema documentation at `/app/docs/DATABASE_SCHEMA.md`
- Documented all 13 collections with field types, indexes, and relationships
- Included Entity Relationship Diagram

### ✅ Offline Sync Feature (NEW)
**Backend:**
- Created `/api/sync/*` endpoints in `/app/backend/services/sync/routes.py`
- POST `/api/sync/push` - Push local changes with conflict resolution
- GET `/api/sync/pull` - Pull server changes since last sync
- GET `/api/sync/status` - Get sync status
- POST `/api/sync/resolve-conflict` - Manual conflict resolution

**Frontend:**
- Created IndexedDB service at `/app/frontend/src/lib/offlineSync.js`
- Created React hook at `/app/frontend/src/hooks/useOfflineSync.js`
- Created UI components at `/app/frontend/src/components/SyncStatus.js`
- Integrated sync status indicator in Layout component

**Features:**
- Automatic sync when coming back online
- Local storage for 8 syncable collections (items, categories, customers, sellers, invoices, transactions, expenses, stock_adjustments)
- Conflict resolution: Last modified wins with server preference
- Visual sync status indicator showing online/offline state
- Pending changes counter
- Manual sync trigger button

## Default Credentials
- **Email**: admin@jewellery.com
- **Password**: admin123

## Key Files Reference

### Backend
- `/app/backend/server.py` - Main FastAPI app
- `/app/backend/shared/models.py` - All Pydantic models
- `/app/backend/services/sync/routes.py` - Sync API endpoints

### Frontend
- `/app/frontend/src/lib/offlineSync.js` - IndexedDB sync service
- `/app/frontend/src/hooks/useOfflineSync.js` - React hook
- `/app/frontend/src/components/SyncStatus.js` - Sync UI components

### Documentation
- `/app/docs/DATABASE_SCHEMA.md` - Complete database schema

## API Endpoints

### Sync API (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/push` | Push local changes to server |
| GET | `/api/sync/pull` | Pull server changes |
| GET | `/api/sync/status` | Get sync status |
| POST | `/api/sync/resolve-conflict` | Resolve sync conflicts |

## Prioritized Backlog

### P0 (Completed ✅)
- [x] Clone and run application
- [x] Document database schema
- [x] Implement offline sync feature

### P1 (High Priority)
- [ ] Add sync progress indicator with percentage
- [ ] Implement selective sync (choose which collections to sync)
- [ ] Add offline queue management UI

### P2 (Medium Priority)
- [ ] PDF export for reports (works offline)
- [ ] Push notifications for sync conflicts
- [ ] Data compression for large sync payloads

## Testing Status
- ✅ Backend Health API - Passed
- ✅ Auth Login API - Passed
- ✅ Sync Status API - Passed
- ✅ Sync Push/Pull APIs - Passed
- ✅ Frontend Load - Passed
- ✅ Login Flow - Passed
- ✅ Sync Status Indicator - Visible and functional

*Last Updated: January 2025*
