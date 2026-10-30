# BookLeaf Author Support & Communication Portal
### Production-Grade Full-Stack Application — Full Stack Developer Assignment 1

A robust, AI-assisted author support and ticket operations platform engineered for **BookLeaf Publishing** (processing 1,200+ monthly titles across a catalog of 22,000+ books). Features a dual-portal interface (Author Portal & Admin Operations Portal) over a unified Node.js/Express API gateway, authenticated Socket.io real-time events, MongoDB/Mongoose persistence, and a bounded OpenAI `gpt-4o-mini` AI engine.

---

## 📑 Table of Contents
1. [Executive Summary & Architecture](#1-executive-summary--architecture)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Quickstart & Installation](#4-quickstart--installation)
5. [Database Seeding & Demo Credentials](#5-database-seeding--demo-credentials)
6. [AI Strategy & Prompt Engineering](#6-ai-strategy--prompt-engineering)
7. [API Design & Documentation (Swagger)](#7-api-design--documentation-swagger)
8. [Real-Time WebSocket Architecture](#8-real-time-websocket-architecture)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Deployment Preparation](#10-deployment-preparation)
11. [Known Limitations & Future Roadmap](#11-known-limitations--future-roadmap)

---

## 1. Executive Summary & Architecture

The application addresses BookLeaf's author communication challenge at scale. Authors frequently reach out regarding royalties, book publication status, ISBN errors, and printing quality. 

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Vite + React)"]
        AuthorUI["Author Portal\n(Dashboard, Books, Ticket Form, Conversation)"]
        AdminUI["Admin Operations Portal\n(Triage Queue, Analytics, AI Copilot, Notes)"]
    end

    subgraph API ["Gateway Layer (Node.js / Express)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        OwnershipGuard["Author Ownership Scoping Guard"]
        RestRouter["REST API Routers (/auth, /authors, /tickets, /admin)"]
        SocketEngine["Socket.io Server (Authenticated Rooms & Events)"]
        Validation["Zod Validation & Centralized Error Envelope"]
    end

    subgraph AI ["AI Operations Layer (OpenAI gpt-4o-mini)"]
        Classifier["Async Classification & Severity Engine"]
        Drafter["KB-Grounded Response Draft Engine"]
        Cache["Draft Cache (ticketId + lastMessageId)"]
    end

    subgraph DB ["Database (MongoDB Atlas / Local)"]
        UsersCol[("Users Collection")]
        AuthorsCol[("Authors Collection")]
        BooksCol[("Books Collection")]
        TicketsCol[("Tickets Collection")]
        MessagesCol[("Messages Collection (Public)")]
        NotesCol[("InternalNotes Collection (Private)")]
    end

    AuthorUI -->|REST + Bearer JWT| AuthMiddleware
    AdminUI -->|REST + Bearer JWT| AuthMiddleware
    AuthorUI <-->|Socket.io (user:{id}, ticket:{id})| SocketEngine
    AdminUI <-->|Socket.io (admins, ticket:{id})| SocketEngine

    AuthMiddleware --> OwnershipGuard --> RestRouter --> Validation
    Validation --> DB
    RestRouter -->|Async Queue| Classifier
    RestRouter -->|On Demand| Drafter
    Drafter <--> Cache
    Classifier --> TicketsCol
    Classifier -->|Emit 'ticket:classified'| SocketEngine
```

---

## 2. Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS (editorial publishing design system), React Router v6, Axios, Lucide React, Socket.io Client.
- **Backend:** Node.js (v20+ / v22), Express.js, Mongoose 8, JWT (`jsonwebtoken`), `bcryptjs`, Socket.io, `helmet`, `cors`, `morgan`, `express-rate-limit`.
- **Database:** MongoDB (Local or Atlas) with optimized compound indexes.
- **AI / LLM:** OpenAI API (`gpt-4o-mini`), server-side execution, JSON response format, Zod validation, draft caching, prompt-injection hardening.
- **API Documentation:** Swagger / OpenAPI 3.0 served at `/api/docs`.
- **Testing:** Vitest + Supertest integration suite.

---

## 3. Repository Structure

```
bookleaf-author-support-portal/
├── frontend/
│   ├── src/
│   │   ├── components/common/   # Badge, Button, Card, Input, Modal, Skeleton, EmptyState, Pagination
│   │   ├── context/             # AuthContext, SocketContext, ToastContext
│   │   ├── layouts/             # AuthorLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── author/          # AuthorDashboard, MyBooks, SubmitTicket, MyTickets, AuthorTicketDetail
│   │   │   ├── admin/           # AdminDashboard, AdminTicketQueue, AdminTicketDetail, AdminAuthors
│   │   │   └── common/          # Login (with 1-click credential selector)
│   │   ├── routes/              # ProtectedRoute, AppRouter
│   │   ├── services/            # Axios API clients (auth, author, ticket, admin)
│   │   └── index.css            # Editorial typography & Tailwind directives
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json              # SPA rewrite for Vercel deployment
├── backend/
│   ├── src/
│   │   ├── ai/                  # aiService.js, prompts.js, knowledgeBase.js, draftCache.js, eval.js
│   │   ├── config/              # db.js, env.js
│   │   ├── controllers/         # authController, authorController, ticketController, adminController
│   │   ├── docs/                # swagger.json OpenAPI spec
│   │   ├── middleware/          # auth, rbac, errorHandler, rateLimiter
│   │   ├── models/              # User, Author, Book, Ticket, Message, InternalNote, Counter
│   │   ├── routes/              # authRoutes, authorRoutes, ticketRoutes, adminRoutes, healthRoutes
│   │   ├── seeds/               # seed.js (imports dataset, creates demo users)
│   │   ├── sockets/             # socketServer.js (authenticated rooms & dispatchers)
│   │   ├── utils/               # apiResponse, jwt
│   │   ├── validators/          # Zod validation schemas
│   │   ├── app.js               # Express application configuration
│   │   └── server.js            # HTTP and Socket server bootstrap
│   ├── tests/                   # api.test.js (18 integration tests)
│   ├── package.json
│   ├── render.yaml              # Render deployment configuration
│   └── .env.example
├── docs/
│   ├── assets/
│   │   ├── BookLeaf Technical Assignment.pdf
│   │   └── BookLeaf Sample Data.json
│   ├── architecture.md          # Full architectural blueprint
│   ├── approach-writeup.md      # One-page priority & trade-off rationale
│   ├── requirements-extraction.md # Comprehensive requirements analysis
│   └── assumptions.md           # Business policies & edge case log
├── package.json                 # Monorepo root scripts
└── README.md
```

---

## 4. Quickstart & Installation

### Prerequisites
- Node.js 18+ (tested on Node v22.20.0)
- npm 9+
- MongoDB instance running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI.

### Step 1: Clone and Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd BookLeafTask

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Step 2: Environment Variables
Create `.env` inside `backend/` (or copy from `backend/.env.example`):
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/bookleaf_db
JWT_SECRET=supersecret_jwt_key_bookleaf_2026_change_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Create `.env` inside `frontend/` (or copy from `frontend/.env.example`):
```ini
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### Step 3: Seed the Database
```bash
npm run seed
```

### Step 4: Start the Applications
In terminal 1 (Backend API & Sockets):
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000
```

In terminal 2 (Frontend React + Vite):
```bash
cd frontend
npm run dev
# Portal accessible at http://localhost:5173
```

---

## 5. Database Seeding & Demo Credentials

The idempotent seed script (`npm run seed`) imports all **10 authors and 18 books** verbatim from `docs/assets/BookLeaf Sample Data.json` without modifying values. Demo accounts are created separately:

| Portal | Role | Name | Email | Password | Dataset Profile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | BookLeaf Ops Admin | `admin@bookleaf.com` | `Admin@12345` | Full triage, overrides, AI copilot & internal notes |
| **Author** | `author` | Priya Sharma | `priya.sharma@email.com` | `Author@12345` | 2 Published Books (₹3,570 Pending Royalty) |
| **Author** | `author` | Rohit Kapoor | `rohit.kapoor@email.com` | `Author@12345` | 2 Published Books (Repro India & In-House) |
| **Author** | `author` | Sneha Kulkarni | `sneha.kulkarni@email.com` | `Author@12345` | 3 Books (Includes BK013 **In Production - Cover Design**) |
| **Author** | `author` | Ananya Reddy | `ananya.reddy@email.com` | `Author@12345` | 1 Book (₹0 Paid, ₹2,546 Pending Royalty) |
| **Author** | `author` | Kavita Deshmukh| `kavita.deshmukh@email.com` | `Author@12345` | 2 Books (BK015 **In Typesetting**, BK016 with ₹850 < threshold) |

*(Note: On the `/login` page, click any of the 1-click demo account buttons to populate credentials instantly.)*

---

## 6. AI Strategy & Prompt Engineering

### Bounded Operational Co-Pilot
The AI integration (`backend/src/ai/`) provides two specialized capabilities:
1. **Auto-Classification & Severity Scoring:** Evaluates incoming author queries against book metadata and returns a validated JSON object with `category`, `priority`, `confidence`, and `reasoning`.
2. **Knowledge-Grounded Draft Responses:** Produces empathetic, policy-accurate replies for support admins using strictly matched BookLeaf policies.

### The Six Valid Categories & Four Priorities
- **Categories:** `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`.
- **Priorities:** `Critical`, `High`, `Medium`, `Low`.

### Prompt Hardening & Safeguards
- **Prompt Injection Defense:** Author queries are wrapped in XML delimiters (`<<<AUTHOR_QUERY>>> ... <<<END_QUERY>>>`) with explicit system instructions to ignore instructions embedded inside user text.
- **Strict Human-in-the-Loop:** Drafts are presented in an editable textarea on the admin workbench. **AI responses are NEVER auto-sent.**
- **Cost & Token Optimization:**
  - Low temperature (`0.1`) and bounded `max_tokens: 300` for classification.
  - Topical Knowledge Base filtering: only relevant sections are sent per call, saving ~70% of prompt tokens.
  - In-memory draft response caching keyed by `ticketId + lastMessageId`.
- **Graceful Degradation:** If `OPENAI_API_KEY` is not provided or the OpenAI API experiences downtime, ticket creation **never fails**. Tickets are saved with `aiStatus: 'failed'` and `classificationSource: 'pending'`, enabling manual triage by admins.

### AI Benchmark Evaluation Script
```bash
npm run ai:eval
```
Evaluates the PDF's sample queries against the classification engine. If an API key is absent, it prints a clean message and lists the registered test cases without faking results.

---

## 7. API Design & Documentation (Swagger)

All API endpoints follow RESTful conventions, return unified JSON response envelopes, and validate requests via Zod.

Interactive Swagger documentation is available at:
👉 **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**

### Unified Response Format
**Success Envelope (HTTP 200 / 201):**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 15, "total": 24 }
}
```

**Error Envelope (HTTP 4xx / 5xx):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Subject must be at least 5 characters long",
    "details": [ ... ]
  }
}
```

---

## 8. Real-Time WebSocket Architecture

Socket.io is authenticated during the handshake via the author or admin JWT token.
- **Rooms:**
  - `user:{userId}`: Direct notifications (e.g. ticket classification complete).
  - `admins`: Broadcast room for new tickets, internal notes, and assignment changes.
  - `ticket:{ticketId}`: Scoped room for real-time conversation between author and assigned admins.
- **Air-Gap Privacy Guarantee:** Admin internal notes are emitted **only** to the `admins` room. They are never transmitted over the `ticket:{id}` room or accessible to author clients.

---

## 9. Automated Testing Suite

We maintain an automated integration test suite covering authentication, RBAC, author data isolation, ticket lifecycles, internal note privacy, status reopenings, and validation errors.

Run the test suite:
```bash
cd backend
npm test
```

### Verified Test Results (18 / 18 Passed)
```
 ✓ tests/api.test.js (18 tests) 2516ms
   ✓ 1. Health Check Endpoint > GET /api/v1/health should return status healthy and DB connected
   ✓ 2. Authentication & RBAC > should authenticate Admin user and return token
   ✓ 2. Authentication & RBAC > should authenticate Author user (Priya) and return token
   ✓ 2. Authentication & RBAC > should authenticate Author user (Ananya) and return token
   ✓ 2. Authentication & RBAC > should reject invalid password with 401
   ✓ 2. Authentication & RBAC > should reject unauthenticated request to protected route with 401
   ✓ 2. Authentication & RBAC > should reject Author attempting to access Admin dashboard with 403
   ✓ 3. Author Data Isolation > Priya Sharma should see only her own books
   ✓ 3. Author Data Isolation > Priya Sharma attempting to fetch Ananya’s book by ID should return 404 (not leak)
   ✓ 3. Author Data Isolation > Author dashboard computes accurate financial totals
   ✓ 4. Ticket Lifecycle > Author creates ticket successfully and receives 201
   ✓ 4. Ticket Lifecycle > Author 2 (Ananya) should NOT be able to view Author 1’s ticket (returns 404)
   ✓ 4. Ticket Lifecycle > Admin should be able to view any ticket and see both messages and internal notes
   ✓ 4. Ticket Lifecycle > Author viewing their own ticket should NEVER see internal notes
   ✓ 4. Ticket Lifecycle > Admin overrides priority and category (marked as manual)
   ✓ 4. Ticket Lifecycle > Admin responds publicly and marks status as Resolved
   ✓ 4. Ticket Lifecycle > Author replying to a Resolved ticket automatically reopens it to In Progress
   ✓ 5. Input Validation > should return 400 with validation details when subject is too short

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

---

## 10. Deployment Preparation

The project is fully prepared for one-click production deployment:
- **Frontend on Vercel:** Includes `vercel.json` SPA rewrite rules. Set environment variables `VITE_API_URL` and `VITE_SOCKET_URL`.
- **Backend on Render:** Includes `render.yaml` with health check path `/health`, start command `npm start`, and environment variable definitions.
- **Database on MongoDB Atlas:** Standard Mongoose connection with SSL and connection pooling. Ensure network access allowlist includes `0.0.0.0/0` or the Render outbound IP.

*(Status: Prepared and validated locally; not deployed to live remote targets).*

---

## 11. Known Limitations & Future Roadmap

1. **Local AI Execution:** If an OpenAI API key is not supplied, AI classification falls back to manual triage (`classificationSource: 'pending'`). The application continues to function smoothly.
2. **Simulated File Uploads:** As specified in PDF page 2, file attachments capture filename, size, and MIME type metadata without requiring external AWS S3 storage buckets.
3. **Queue Scalability:** In high-volume production (1,200+ monthly books), background AI tasks should be decoupled from the Express process into a BullMQ Redis queue.

---
*Built with care for BookLeaf Publishing.*
