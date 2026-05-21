# Krunchy Admin Portal 🍪

A premium, containerized administration portal designed for cookie & biscuit brands to manage orders, customer CRM relations, catalog product items, social media campaigns, and simulated WhatsApp notifications.

The system is structured as a **distributed monorepo** with a decoupled frontend client, a backend REST API, and a PostgreSQL database.

---

## 🏗️ System Architecture & Layout

The project separates frontend static assets from backend logic, allowing you to deploy the frontend to static distributors (e.g., AWS S3 + CloudFront, Vercel) and the backend API to on-demand servers (e.g., AWS ECS, Render, Railway).

```
krunchy/
├── backend/                  # Node.js Express REST API (On-Demand Backend)
│   ├── src/
│   │   ├── config/db.ts      # PostgreSQL connection pool & schema initialization
│   │   ├── controllers/      # Route controllers (Orders, CRM, Items, Calendar)
│   │   ├── services/         # WhatsApp notification engine (Twilio SDK wrapper)
│   │   └── index.ts          # Express API server & routes
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React SPA (S3-compatible Static Client)
│   ├── src/
│   │   ├── components/       # Forms, Kanban board, Social calendar, Toasts
│   │   ├── services/api.ts   # Axios/Fetch API wrapper mapping backend routes
│   │   ├── App.tsx           # Route shell and global alerts coordinator
│   │   ├── index.css         # CSS design system (Glassmorphism & Slate theme)
│   │   └── main.tsx          # React application mount
│   ├── Dockerfile
│   └── vite.config.ts
└── docker-compose.yml        # Local orchestrated development environment
```

---

## 🚀 Key Functional Modules

### 1. Order Creation & Kanban Hub
- **E-Commerce Catalog Checkout**: A visual catalog representing baked items with image icons, prices, and add-to-cart adjusters.
- **Asynchronous Customer Search**: Auto-queries database by phone or name while typing. Auto-fills fields for existing customers.
- **Automatic Customer Entry**: If customer phone number is new, a profile card is created in the database during order submission.
- **Kanban Tracker Board**: Grouping orders into columns (`Pending`, `Preparing`, `Ready`, `Delivered`, `Cancelled`). Includes progression handlers.
- **Payment Switches**: Instantly toggle payment status (`Unpaid` / `Paid`) on cards.

### 2. Customer CRM & Demographics Analytics
- **Demographics Dashboard**: Dynamic CSS charts parsing customer distribution by city/region, gender splits, and order source channels.
- **Top Patrons Grid**: Automatically calculates top 5 spenders by total order value.
- **Promotional Campaigns Broadcast**: Multi-select customers via checklists, compose customized WhatsApp campaign broadcasts, and dispatch messages.

### 3. Product Catalog Manager
- **Product Registry Table**: Audit ingredients, unit costs, and shelf lives.
- **Modals**: Edit button triggers an overlay dialog for instant updates.

### 4. Social Media Calendar Scheduler
- **Interactive Monthly Grid**: Browse marketing campaigns by date.
- **Form Scheduling**: Select dates, platform channels (Instagram, Facebook, Twitter, LinkedIn), draft captions, attach asset notes, and preview creatives.

### 5. WhatsApp Simulation & logs center
- **Outbox Audits**: History ledger tracing all notification types, phone numbers, and template statuses.
- **Visual Alert bubbles**: When a WhatsApp message triggers (e.g. order confirmation, order readiness, payment success, promotions), a green notification toast slides in showing the message payload.

---

## 🗄️ Database Schema Design (PostgreSQL)

```sql
-- Status & Payment Enum parameters
CREATE TYPE order_status AS ENUM ('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled');
CREATE TYPE payment_status AS ENUM ('Unpaid', 'Paid');

-- 1. Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(50) UNIQUE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer Not to Say')),
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customers_search ON customers(contact, name);

-- 2. Items Table
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    ingredients TEXT[] NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    best_before_duration VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    source VARCHAR(100) NOT NULL,
    expected_delivery_date TIMESTAMP NOT NULL,
    expected_delivery_location TEXT NOT NULL,
    status order_status DEFAULT 'Pending',
    payment_status payment_status DEFAULT 'Unpaid',
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Items Junction Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
);

-- 5. Social Campaigns Table
CREATE TABLE social_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    notes TEXT,
    caption TEXT,
    scheduled_date TIMESTAMP NOT NULL,
    platforms VARCHAR(50)[] NOT NULL,
    image_url TEXT,
    attachment_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Published', 'Draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. WhatsApp Logs Table
CREATE TABLE whatsapp_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('OrderReceived', 'OrderReady', 'PaymentSuccess', 'Promotion')),
    status VARCHAR(50) DEFAULT 'Sent' CHECK (status IN ('Sent', 'Failed', 'Pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚡ WhatsApp Dispatch Logic (Twilio REST Integration)

The backend service (`backend/src/services/whatsapp.ts`) determines message dispatch paths based on configuration:
- **Simulation mode**: If `WHATSAPP_SIMULATE=true` or Twilio credentials are empty, the backend logs the compiled message template to the database logs and returns it in the API response. The React client intercepts this and displays it inside a floating WhatsApp Toast bubble on the screen.
- **Production mode**: If credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are populated, it bypasses the simulation and invokes the Twilio REST API using Node's native `fetch` to send a live message to the recipient's phone number.

---

## ⚙️ Local Development Setup

### Prerequisites
- Docker & Docker Compose installed.
- Node.js (v18+) for local dev tools.

### Running Containers
From the root workspace directory, run:
```bash
docker compose up -d --build
```
This command starts:
- **Database (PostgreSQL)**: Port `5432` (Username: `postgres`, Password: `postgrespassword`, DB: `krunchy_db`).
- **Backend API Server**: Port `5000` (Node Express compiled code running via `ts-node-dev`).
- **Frontend SPA Client**: Port `5173` (Vite dev server).

### Endpoints
- **Admin Dashboard UI**: [http://localhost:5173](http://localhost:5173)
- **Backend REST Check**: [http://localhost:5000/api/items](http://localhost:5000/api/items)

---

## 💰 Production Deployment Models & Costs

### Option A: AWS Serverless (Enterprise & Highly Scalable)
- **Frontend**: S3 static bucket + CloudFront CDN. Cost: **~$0.50/mo** (Standard data transfer under 1TB is free).
- **Backend API**: Node.js app hosted on AWS ECS Fargate container or split as AWS Lambda serverless functions. Cost: **~$1.00 to $9.00/mo**.
- **PostgreSQL**: Neon.tech serverless DB (Free tier: 500MB) or AWS RDS Postgres instance (db.t4g.micro: **~$15.00/mo**).
- **Estimated startup cost**: **$1.50 to $25.00/mo**.

### Option B: Unified PaaS (Minimal Maintenance)
- **Frontend**: Deployed to Render Static Sites (Free).
- **Backend**: Render Web Service (on-demand Node.js web-service). Cost: **$7.00/mo** (Starter tier to prevent sleeping).
- **PostgreSQL**: Managed PostgreSQL on Render. Cost: **$7.00/mo** (7GB storage).
- **Estimated cost**: **$14.00/mo**.

### Option C: Supabase BaaS (Fastest Deploy)
- **Frontend**: Vercel Static Hosting (Free).
- **Backend/DB**: Supabase provides hosted PostgreSQL, edge functions, and REST APIs. Cost: **$0.00/mo** (Within Free Tier: 500MB DB).
- **Estimated cost**: **$0.00/mo**.
