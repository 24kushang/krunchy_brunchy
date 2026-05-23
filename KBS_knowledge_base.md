# KBS — Krunchy Brunchy Operations (OMS) Knowledge Base

> **Purpose:** This document captures everything built, every decision made, and every known issue discovered during development of the internal Order Management System (OMS) for Krunchy Brunchy. Use it as the authoritative reference for onboarding, debugging, and planning future work.

---

## 1. Project Overview

| Field | Value |
|---|---|
| **System Name** | Krunchy Brunchy OMS |
| **Type** | Internal Admin-Only Order & Customer Management System |
| **Users** | Internal Operational Staff / Administrators |
| **Local Access** | Frontend: `http://localhost:5173` — Backend API: `http://localhost:3000` |
| **Version** | 1.0.0 |
| **Repo Root** | `/Users/kushangharia/kbs` |

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | MUI (Material UI) component library |
| **Backend** | NestJS + TypeORM + TypeScript | Modular architecture |
| **Database** | PostgreSQL 15 | Managed via TypeORM migrations |
| **DevOps** | Docker Compose | All services containerised |
| **File Storage** | Google Drive API | For media uploads (social media content) |
| **Styling** | MUI + custom tokens | Brand colors from brand library |

---

## 3. Infrastructure & DevOps

### 3.1 Docker Compose Services

```
docker compose up -d       # Start all services
docker compose down        # Stop all
docker compose logs -f     # Watch all logs
```

| Container | Name | Port | Description |
|---|---|---|---|
| PostgreSQL 15 | `oms_postgres` | `5432` | Primary database |
| NestJS Backend | `oms_backend` | `3000` | API server |
| Vite Frontend | `oms_frontend` | `5173` | React dev server |

### 3.2 Docker Compose Config

- **DB credentials:** user `admin`, password `development_password`, db `oms_db`
- **Backend env vars injected:** `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- **Frontend env vars injected:** `VITE_API_URL=http://localhost:3000`
- **Volumes:** `postgres_data` (named volume for DB persistence); `./backend` and `./frontend` mounted for hot reload
- **`node_modules` isolation:** Each container uses an anonymous volume over `/usr/src/app/node_modules` so host modules don't conflict

### 3.3 Key Dev Commands

```bash
# Run inside the backend container
docker exec -it oms_backend sh

# Apply database migrations
npm run migration:run

# Generate a new migration after entity changes
npm run migration:generate -- src/database/migrations/<MigrationName>

# Run seed script (resets and repopulates all data)
npm run seed
```

> [!IMPORTANT]
> Every time the TypeORM entities are changed, a new migration **must be generated and run**. The app does NOT auto-sync in production mode.

---

## 4. Brand Identity

| Token | Value |
|---|---|
| **Primary Orange** | `#FF5A09` |
| **Primary Blue** | `#0A3BB0` |
| **Brand Font** | `Fredoka` (Google Fonts) — used for headings and logo |
| **Light BG** | `#FAF6F0` |
| **Light Border** | `#EFEAE4` |
| **Dark BG** | `#1A1918` |
| **Dark Border** | `#2C2A28` |

The sidebar logo displays:
- Orange box with white "K" in Fredoka font
- "KRUNCHY" in orange, "BRUNCHY" in blue below it

---

## 5. Database Schema

### 5.1 Entity Relationships

```
customers ──< orders ──< order_items >── items ──< item_price_history
              |
              └──< order_status_history
              |
              └──< whatsapp_logs

social_media_content  (standalone)
```

### 5.2 Entity Details

#### `customers`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | varchar(150) | |
| `contact` | varchar(50) | **UNIQUE** — used as customer identifier |
| `gender` | enum | `Male`, `Female`, `Other` |
| `location` | varchar(100) | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `orderNumber` | varchar(50) | **UNIQUE**, format `KB-XXXXX` (starts at `KB-10001`) |
| `source` | enum | `WhatsApp`, `Phone`, `Instagram`, `Website`, `Walk-in` — default `Phone` |
| `expectedDeliveryDate` | timestamp | nullable |
| `deliveryLocation` | varchar(255) | nullable |
| `customerId` | UUID FK | → `customers.id` (CASCADE DELETE) |
| `status` | enum | `Pending`, `Preparing`, `Ready to Deliver`, `Delivered`, `Cancelled` |
| `totalAmount` | decimal(10,2) | computed at order creation |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | **used by Kanban board for filtering** |

#### `order_items`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `orderId` | UUID FK | → `orders.id` (CASCADE DELETE) |
| `itemId` | UUID FK | → `items.id` |
| `quantity` | int | |
| `priceAtOrder` | decimal(10,2) | price snapshot at time of order |

#### `items`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | varchar(150) | UNIQUE |
| `ingredients` | text | nullable |
| `bestBeforeDays` | int | |
| `imageUrl` | varchar | nullable |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

#### `item_price_history`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `itemId` | UUID FK | → `items.id` (CASCADE DELETE) |
| `price` | decimal(10,2) | |
| `changedAt` | timestamp | Used to determine active (latest) price |

> [!NOTE]
> Items do not have a single `price` column. The **active price** is always the most recent record in `item_price_history` sorted by `changedAt DESC`. The `priceAtOrder` snapshot on `order_items` locks the price at order creation time.

#### `order_status_history`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `orderId` | UUID FK | → `orders.id` (CASCADE DELETE) |
| `status` | enum | same values as `orders.status` |
| `changedBy` | varchar | defaults to `'Admin'` |
| `changedAt` | timestamp | |

#### `whatsapp_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `orderId` | UUID FK | → `orders.id` (SET NULL on delete) |
| `recipientName` | varchar(150) | |
| `recipientContact` | varchar(50) | |
| `triggeringEvent` | varchar(100) | e.g. `Order Created (Pending)` |
| `status` | enum | `Sent`, `Delivered`, `Failed` |
| `errorMessage` | text | nullable |
| `timestamp` | timestamp | |

#### `social_media_content`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | varchar(250) | |
| `caption` | text | |
| `scheduledAt` | timestamp | |
| `mediaUrl` | varchar | nullable — Google Drive link |
| `platforms` | text | comma-separated |
| `checklist` | jsonb | task checklist state |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### 5.3 Migrations History

| Migration File | What It Does |
|---|---|
| `1779519479015-InitialSchema.ts` | Creates ALL tables: `item_price_history`, `items`, `order_items`, `order_status_history`, `whatsapp_logs`, `orders`, `customers`, `social_media_content` + all FKs |
| `1779521531165-AddOrderDetails.ts` | Adds `source` enum column, `expectedDeliveryDate`, and `deliveryLocation` to `orders` table |

---

## 6. Backend Architecture (`/backend`)

### 6.1 Module Map

```
src/
├── app.module.ts          ← Root module, imports all feature modules
├── main.ts                ← Bootstrap (port 3000, global validation pipe)
├── database/
│   ├── data-source.ts     ← TypeORM DataSource for CLI (migrations)
│   ├── database.module.ts ← TypeOrmModule config for runtime
│   ├── entities/          ← All TypeORM entity classes
│   ├── migrations/        ← Migration files (source of truth for DB schema)
│   └── seed/seed.ts       ← Database seeder
└── modules/
    ├── orders/            ← Order CRUD + status transitions
    ├── customers/         ← Customer CRUD + search
    ├── items/             ← Item + price management
    ├── whatsapp/          ← WhatsApp log viewer + mock dispatch worker
    ├── social-media/      ← Social media content calendar
    └── upload/            ← Google Drive upload handler
```

### 6.2 Order Creation Flow (Critical Path)

The `OrdersService.create()` method runs entirely inside a **TypeORM database transaction**:

1. **Resolve or Create Customer** — looks up by `contact` (unique). If not found, validates that `name`, `gender`, and `location` are provided, then creates a new customer.
2. **Generate Order Number** — finds last order by `orderNumber DESC`, increments serial. Format: `KB-10001`, `KB-10002` …
3. **Create Order record** — sets `status = Pending`, `totalAmount = 0`, attaches optional `source`, `expectedDeliveryDate`, `deliveryLocation`.
4. **Create OrderItems** — for each item, loads `item_price_history`, picks latest price, creates `OrderItem` with price snapshot.
5. **Finalize totalAmount** — sums `priceAtOrder × quantity`, saves back to order.
6. **Create initial StatusHistory** — logs `Pending` entry.
7. ~~**Trigger WhatsApp notification**~~ — **CURRENTLY COMMENTED OUT** (see Known Issues §9).

### 6.3 Order Status Update Flow

`PATCH /api/orders/:id/status` triggers:
1. Load full order
2. Save new status
3. Append `order_status_history` entry
4. Conditionally fire WhatsApp notification for `Pending`, `Ready to Deliver`, `Delivered` transitions

### 6.4 API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders` | Paginated/filtered/sorted order list |
| `GET` | `/api/orders/:id` | Single order with all relations |
| `POST` | `/api/orders` | Create new order (transactional) |
| `PATCH` | `/api/orders/:id/status` | Update order status |
| `GET` | `/api/customers` | Paginated customer list |
| `GET` | `/api/customers/lookup?contact=` | Find customer by contact |
| `POST` | `/api/customers` | Create customer |
| `PATCH` | `/api/customers/:id` | Update customer |
| `GET` | `/api/items` | All items (with active price) |
| `POST` | `/api/items` | Create item |
| `PATCH` | `/api/items/:id` | Update item |
| `POST` | `/api/items/:id/price` | Add price history entry |
| `GET` | `/api/whatsapp/logs` | Paginated WhatsApp log |
| `GET` | `/api/whatsapp/templates` | Hardcoded template definitions |
| `POST` | `/api/whatsapp/retry/:id` | Retry failed message log |
| `GET` | `/api/social-media` | All social media content |
| `POST` | `/api/social-media` | Create content |
| `PATCH` | `/api/social-media/:id` | Update content |
| `DELETE` | `/api/social-media/:id` | Delete content |
| `POST` | `/api/upload/drive` | Upload file to Google Drive |

### 6.5 Query Builder (Orders findAll)

`GET /api/orders` supports these query params:
- `page` (default 1), `limit` (default 10)
- `status` — filter by order status enum value
- `search` — ILIKE match on `orderNumber`, `customer.name`, `customer.contact`
- `startDate` / `endDate` — filter on `order.createdAt BETWEEN`
- `sortBy` — field name (special case: `customerName` → `customer.name`); default `createdAt`
- `sortOrder` — `ASC` | `DESC`; default `DESC`

---

## 7. Frontend Architecture (`/frontend`)

### 7.1 File Map

```
src/
├── main.tsx               ← Vite entry, wraps App
├── App.tsx                ← BrowserRouter + route declarations
├── context/
│   └── ThemeContext.tsx   ← Light/Dark mode context + MUI theme provider
├── components/
│   └── Layout.tsx         ← Persistent sidebar drawer + top AppBar
├── pages/
│   ├── NewOrder.tsx       ← Create Order wizard (multi-step form)
│   ├── Orders.tsx         ← Kanban Board + Ledger DataGrid
│   ├── Items.tsx          ← Item catalog CRUD
│   ├── Customers.tsx      ← Customer list + profile editor
│   ├── SocialMedia.tsx    ← Content calendar
│   └── WhatsappHub.tsx    ← WhatsApp log viewer
└── utils/
    └── api.ts             ← Axios instance (baseURL from VITE_API_URL)
```

### 7.2 Routing

| Path | Page | Notes |
|---|---|---|
| `/` | → redirects to `/orders` | |
| `/orders` | `Orders.tsx` | Default landing page |
| `/new-order` | `NewOrder.tsx` | |
| `/items` | `Items.tsx` | |
| `/customers` | `Customers.tsx` | |
| `/social-media` | `SocialMedia.tsx` | |
| `/whatsapp` | `WhatsappHub.tsx` | |
| `*` | → redirects to `/orders` | catch-all |

### 7.3 Theme System

- **Context:** `ThemeContext.tsx` — exposes `mode` (`'light'` | `'dark'`) and `toggleTheme()`
- **Persistence:** mode stored in `localStorage` key `colorMode`
- **MUI Theme:** custom palette created with brand colors; `Fredoka` loaded via Google Fonts in `index.html`
- **Toggle:** top-right AppBar button; sun/moon icon

### 7.4 MUI Icon Import Rule

> [!WARNING]
> **CRITICAL** — Named imports from `@mui/icons-material` cause Vite pre-transform crashes in this project:
> ```tsx
> // ❌ WRONG — will break Vite
> import { AddCircleOutline } from '@mui/icons-material';
>
> // ✅ CORRECT — always use direct path imports
> import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
> ```
> Every icon in the codebase must use the direct path import pattern.

---

## 8. Feature Deep-Dives

### 8.1 Orders Dashboard (`Orders.tsx`)

Two views toggled by a tab switcher:

#### Kanban Board (Tab 0)
- 5 columns: `Pending` → `Preparing` → `Ready to Deliver` → `Delivered` → `Cancelled`
- **Drag-and-drop** between columns → calls `PATCH /api/orders/:id/status`
- **Quick arrow buttons** on each card for keyboard-accessible column moves
- **Column height:** fixed at `72vh`, each column independently scrollable with a thin (4px) custom scrollbar
- **Card time filtering logic (implemented):**
  - **All columns:** only shows orders created within the **last 7 days**
  - **Delivered / Cancelled:** additionally hidden if `updatedAt` is more than **1 day ago** (falls back to `createdAt` if `updatedAt` unavailable)
- **Chip count** on column header reflects filtered count (not total)
- Loads all orders with `limit=100` (client-side filtering)

#### Ledger View (Tab 1)
- MUI `DataGrid` with **server-side pagination, sorting, filtering**
- Columns: Order #, Customer Name, Contact, Source, Exp Delivery, Order Date, Items Count, Total Price, Status (chip), Actions (Inspect button)
- Supports `status` dropdown filter (only visible in Ledger tab)
- Shared date-range and search filters with Kanban
- CSV export button (planned/available via DataGrid toolbar)

#### Order Inspect Modal
- Opens on card click (Kanban) or Inspect button (Ledger)
- Shows full order details: customer info, source, expected delivery date, delivery location, items list, status history timeline, WhatsApp log entries

### 8.2 Create Order (`NewOrder.tsx`)

Multi-section form:

1. **Customer Lookup** — enter phone/contact number; debounced lookup calls `GET /api/customers/lookup?contact=`
   - If found: prefills name, shows update option
   - If new: shows fields to collect name, gender, location
2. **Order Details** — source (dropdown), expected delivery date (date picker), delivery location (text)
3. **Item Selector** — ecommerce-style grid:
   - Shows item name, current price
   - +/- quantity controls per item
   - Running cart total displayed below grid
4. **Submit** — calls `POST /api/orders`; on success, shows confirmation and resets form

### 8.3 Snack Catalog (`Items.tsx`)

- Lists all items with current price (latest from `item_price_history`)
- Create new items with initial price
- Edit item details
- Add new price entry (price history preserved, new entry = new active price)
- Items displayed as cards with name, current price, best-before days

### 8.4 Customer Insights (`Customers.tsx`)

- Paginated table of all customers
- Search by name or contact
- View order history per customer
- Edit customer profile (name, gender, location)
- Customer creation happens automatically during order flow

### 8.5 WhatsApp Hub (`WhatsappHub.tsx`)

- **Log Table:** paginated view of all `whatsapp_logs` entries with status chips (Sent / Delivered / Failed)
- **Templates Panel:** hardcoded template previews for Order Confirmation, Order Preparing, Ready to Deliver, Delivered
- **Retry button:** for Failed logs — calls `POST /api/whatsapp/retry/:id`, forces success status
- **Mock Worker:** 2-second async delay simulates dispatch; 5% random failure rate

### 8.6 Content Calendar (`SocialMedia.tsx`)

- Calendar view of scheduled social media posts
- CRUD for content entries (title, caption, platforms, scheduled date, media)
- Media upload via Google Drive integration
- Checklist per post (production tasks tracking)

---

## 9. Known Issues & Active Bugs

### 🔴 Bug: WhatsApp trigger on order creation fails intermittently

**Status:** Partially mitigated — `triggerNotification` call in `OrdersService.create()` is currently **commented out** (lines 215–221 in `orders.service.ts`).

**Root Cause (suspected):** The `whatsappService.triggerNotification()` call is made inside the TypeORM transaction `manager` context. The `WhatsappLog` entity is saved via the `logRepository` which runs on the **main connection**, not the transactional `manager`. If the transaction hasn't committed yet when the log insert runs, there can be a foreign key violation (`orderId` not yet visible).

**Workaround currently in place:**
```ts
// Step 6 in OrdersService.create() — COMMENTED OUT:
// const fullOrder = await manager.findOne(Order, { ... });
// if (fullOrder) {
//   await this.whatsappService.triggerNotification(fullOrder, 'Order Created (Pending)');
// }
```

**Proper Fix (not yet implemented):**
Move the `triggerNotification` call to **after** the transaction completes (outside the `dataSource.transaction()` callback), passing the finalized order object:
```ts
// Inside create():
const finalizedOrder = await this.dataSource.transaction(async (manager) => {
  // ... all the existing logic
  return finalizedOrder;
});

// Trigger notification AFTER transaction commit:
await this.whatsappService.triggerNotification(finalizedOrder, 'Order Created (Pending)');
return finalizedOrder;
```

> [!CAUTION]
> Do not call `triggerNotification` inside the transaction block. The `WhatsappLog` insert uses the global connection pool, not the transactional `EntityManager`, causing FK constraint timing issues.

---

### 🟡 Issue: No `updatedAt` column in `whatsapp_logs`

The Kanban filtering uses `order.updatedAt` to determine when an order reached a terminal state. This works correctly because the `Order` entity has `@UpdateDateColumn()`. The `whatsapp_logs` table does not have an `updatedAt` — it only has `timestamp` (creation time). This is fine for current functionality.

---

### 🟡 Issue: Authentication not implemented

**Status:** Deferred to future scope. The OMS currently has no login screen or session management. Anyone who can reach `localhost:5173` has full admin access.

**Future:** Implement JWT-based login (NestJS Passport + JWT strategy) with a simple admin credentials table. RBAC is **not required**.

---

## 10. Data Seeder

**File:** `/backend/src/database/seed/seed.ts`

Truncates (in dependency order) and re-inserts sample data for all tables. Run with:

```bash
docker exec -it oms_backend npm run seed
```

**Seed data includes:**
- Sample customers with name/gender/location
- Sample items with full price history
- Sample orders across all statuses with realistic `source`, `expectedDeliveryDate`, `deliveryLocation`
- Order status history records
- WhatsApp log entries (including a mix of Delivered and Failed entries)

> [!WARNING]
> Running the seeder **destroys all existing data**. Never run in production.

---

## 11. Future Scope (Not Yet Built)

| Feature | Priority | Notes |
|---|---|---|
| **Authentication (JWT login)** | High | Simple admin credentials, no RBAC needed |
| **CSV Export** | Medium | MUI DataGrid has toolbar export built-in; wire it up |
| **Real WhatsApp API integration** | Medium | Replace mock worker with Meta Cloud API calls |
| **Order analytics dashboard** | Medium | Revenue charts, order volume over time |
| **Notifications / alerts** | Low | In-app toasts for order status changes |
| **Print / invoice generation** | Low | PDF invoice per order |
| **Deployment (AWS S3 + Container)** | Low | Static frontend to S3, backend on ECS/EC2 |
| **GitHub Actions CI/CD** | Low | Build + push Docker images on merge to main |

---

## 12. Development Workflow

### Starting the System

```bash
cd /Users/kushangharia/kbs
docker compose up -d
```

Both frontend and backend have **hot-reload** via volume mounts — editing source files locally updates the running container.

### Making Backend Schema Changes

1. Edit TypeORM entity files in `backend/src/database/entities/`
2. Generate migration: `docker exec oms_backend npm run migration:generate -- src/database/migrations/DescriptiveName`
3. Review the generated file in `backend/src/database/migrations/`
4. Apply: `docker exec oms_backend npm run migration:run`
5. Commit both the entity file and the migration file

### Frontend Icon Imports

Always use direct path:
```tsx
import SomeIcon from '@mui/icons-material/SomeIcon';
```

### Environment Variables

| Variable | Where Set | Value |
|---|---|---|
| `VITE_API_URL` | `docker-compose.yml` | `http://localhost:3000` |
| `DATABASE_*` | `docker-compose.yml` | See §3.1 |
| `GOOGLE_DRIVE_FOLDER_ID` | Host `.env` → compose | Google Drive folder ID for uploads |
| `GOOGLE_APPLICATION_CREDENTIALS` | Host `.env` → compose | Path to service account JSON |

---

## 13. File Reference Index

| File | Purpose |
|---|---|
| [docker-compose.yml](file:///Users/kushangharia/kbs/docker-compose.yml) | Service definitions, ports, env vars |
| [App.tsx](file:///Users/kushangharia/kbs/frontend/src/App.tsx) | Route declarations |
| [Layout.tsx](file:///Users/kushangharia/kbs/frontend/src/components/Layout.tsx) | Sidebar nav + AppBar shell |
| [Orders.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/Orders.tsx) | Kanban board + Ledger DataGrid |
| [NewOrder.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/NewOrder.tsx) | Order creation form |
| [Items.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/Items.tsx) | Item catalog management |
| [Customers.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/Customers.tsx) | Customer profiles |
| [WhatsappHub.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/WhatsappHub.tsx) | WhatsApp log viewer |
| [SocialMedia.tsx](file:///Users/kushangharia/kbs/frontend/src/pages/SocialMedia.tsx) | Content calendar |
| [enums.ts](file:///Users/kushangharia/kbs/backend/src/database/entities/enums.ts) | All shared enums |
| [order.entity.ts](file:///Users/kushangharia/kbs/backend/src/database/entities/order.entity.ts) | Order TypeORM entity |
| [orders.service.ts](file:///Users/kushangharia/kbs/backend/src/modules/orders/orders.service.ts) | Order business logic |
| [whatsapp.service.ts](file:///Users/kushangharia/kbs/backend/src/modules/whatsapp/whatsapp.service.ts) | WhatsApp mock service |
| [1779519479015-InitialSchema.ts](file:///Users/kushangharia/kbs/backend/src/database/migrations/1779519479015-InitialSchema.ts) | Initial DB migration |
| [1779521531165-AddOrderDetails.ts](file:///Users/kushangharia/kbs/backend/src/database/migrations/1779521531165-AddOrderDetails.ts) | Add source/delivery fields |
| [seed.ts](file:///Users/kushangharia/kbs/backend/src/database/seed/seed.ts) | Database seeder |
