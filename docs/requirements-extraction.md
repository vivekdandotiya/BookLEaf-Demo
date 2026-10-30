# BookLeaf Author Support & Communication Portal
## Requirements Extraction & Specification Analysis

**Source of Truth Documents:**
1. `docs/assets/BookLeaf Technical Assignment.pdf` (9 pages)
2. `docs/assets/BookLeaf Sample Data.json` (10 author records, 18 book records)

---

### 1. Project Context & Objectives
- **Company:** BookLeaf Publishing (self-publishing company operating in India & the US; processes 1,200+ books monthly, catalog of 22,000+ titles).
- **Core Problem:** Handling high-volume author communication at scale regarding royalties, production status, ISBN discrepancies, distribution delays, and printing quality.
- **Solution:** A dual-portal full-stack application (Author Portal + Admin Portal) powered by an AI-assisted classification, priority scoring, and response generation engine, supported by a unified Node.js/Express REST backend, Socket.io real-time events, and a MongoDB/Mongoose database.

---

### 2. Evaluation Criteria & Scoring Weights (PDF Page 9)
| Criteria | Weight | Core Focus Areas |
| :--- | :--- | :--- |
| **AI Integration Quality** | **25%** | Structured prompt engineering, deterministic Knowledge Base utilization, response quality, classification accuracy, priority scoring, graceful degradation & fallback, token cost-consciousness. *(Highest weighted)* |
| **Architecture & Code Quality** | **25%** | Clean project structure, separation of concerns, robust abstractions, readable code, error handling, strict schema validation, defensive coding. |
| **API Design** | **15%** | RESTful conventions, JWT authentication, strict role-based access control (RBAC), ownership isolation, Zod input validation, standard HTTP status codes and error envelopes, Swagger/OpenAPI documentation. |
| **Functionality & Completeness** | **15%** | End-to-end working ticket lifecycle, real-time updates via Socket.io, robust edge-case handling (books in production, null financials, null dates). |
| **Product Thinking** | **10%** | Editorial publishing SaaS aesthetic, thoughtful UX for stressed authors, high-density triage workflow for admins, practical safeguards (no auto-send AI). |
| **Documentation & Communication** | **10%** | Comprehensive README, architecture specification, one-page approach write-up, seed instructions, inline comments, clean Git progression. |

---

### 3. Functional Requirements

#### A. Author Portal (Author-Facing)
1. **Authentication:**
   - Email and password login.
   - Safe token handling with auto-logout on expiration.
   - Strict data isolation: Authors can access only their own profile, books, and tickets.
2. **Dashboard Overview:**
   - Author profile (name, email, city, joined date).
   - Server-computed statistics: total books, published books count, in-production books count, total royalty earned, total royalty paid, total royalty pending.
   - Null handling: Null values displayed as "Not available" rather than 0.
   - Recent tickets list with quick status indicators.
3. **My Books Page:**
   - Complete catalog of author's books (both published and in-production).
   - Display fields: Title, ISBN, Genre, Publication Date, Status badge, MRP (INR ₹), Author Royalty Per Copy, Total Copies Sold, Total Royalty Earned, Royalty Paid, Royalty Pending, Last Royalty Payout Date, Print Partner, Available Platforms.
   - Search by title and genre; filter by publication status and platform; sort by date, title, copies sold.
   - Detail view / drawer showing full book metadata and publishing lifecycle state.
   - Books in production must display gracefully with badges such as "In Production - Typesetting" or "In Production - Cover Design".
4. **Submit Support Query:**
   - Form fields:
     - Book selection dropdown (populated with author's books only) + "General / Account Level" option.
     - Subject line (validated length).
     - Detailed description (validated length).
     - Optional file attachment UI (metadata handling).
   - Non-blocking ticket creation: Ticket is saved to DB immediately, returning success to the author; AI classification & priority scoring trigger asynchronously in the background.
   - Real-time notification and insertion into ticket list.
5. **My Tickets & Ticket Details:**
   - Chronological list of author's tickets with status, priority, category, book reference, last update timestamp.
   - Interactive conversation view: Original query followed by public messages from admins and follow-up replies from author.
   - Live updates without page reload via authenticated Socket.io rooms.
   - Author replies to resolved tickets reopen the ticket to "In Progress".
   - **Internal notes are strictly excluded and never exposed in author UI or API responses.**

#### B. Admin Portal (Admin-Facing)
1. **Authentication & RBAC:**
   - Admin login credentials, route guards, full system access.
2. **Operations Dashboard:**
   - Global metrics: Total authors, total books, total tickets, open tickets count, in-progress count, resolved count, closed count, critical and high priority ticket counts.
   - Average first-response time metric calculated from real timestamps (`firstAdminResponseAt` - `createdAt`).
   - Distribution charts: Tickets by category, priority, status, and volume trends.
3. **Ticket Queue & Triage:**
   - Tabular queue with server-side pagination, multi-attribute filtering (status, category, priority, date range, assigned admin, author search).
   - Visual urgency indicators: Highlight oldest unresolved tickets, critical badges, SLA breach warnings.
4. **Ticket Detail & Management:**
   - Side-by-side or split layout: Author profile & book metadata alongside ticket details.
   - Full conversation stream (author query + public messages).
   - Private internal notes tab/section with admin-only visibility.
   - Actions: Update status (`Open`, `In Progress`, `Resolved`, `Closed`), assign ticket to self or colleague, manual override for category and priority (flags audit trail as `classificationSource: 'manual'`).
   - Send public response to author (dispatched via Socket.io).
5. **AI Draft Response Panel:**
   - On opening ticket or on demand ("Generate Draft" button), trigger AI drafting based on author query, book facts, and specific BookLeaf Knowledge Base modules.
   - Draft is displayed in an editable rich text area.
   - **Human-in-the-loop: Drafts are NEVER automatically sent.** Admin reviews, edits, and clicks "Send Response".
   - Cooldown and caching (keyed by `ticketId + lastMessageId`) to prevent redundant OpenAI API calls.
   - Graceful fallback with clear UI messaging if the AI service fails or is disabled.

---

### 4. Technical & Architectural Requirements

1. **Monorepo Structure:**
   ```
   bookleaf-author-support-portal/
   ├── frontend/
   │   ├── src/
   │   │   ├── assets/
   │   │   ├── components/  # Reusable UI system (Button, Badge, Modal, etc.)
   │   │   ├── context/     # Auth, Socket, Toast contexts
   │   │   ├── hooks/
   │   │   ├── layouts/     # AuthorLayout, AdminLayout
   │   │   ├── pages/       # Author & Admin pages
   │   │   ├── routes/      # ProtectedRoute, AppRouter
   │   │   ├── services/    # Axios API client instances
   │   │   └── utils/       # Formatters (currency, dates), constants
   │   ├── package.json
   │   ├── tailwind.config.js
   │   └── vite.config.js
   ├── backend/
   │   ├── src/
   │   │   ├── ai/          # prompts/, schemas/, knowledgeBase/, aiService.js
   │   │   ├── config/      # db.js, env.js
   │   │   ├── controllers/ # auth, author, admin, ticket, message controllers
   │   │   ├── middleware/  # auth, rbac, errorHandler, rateLimiter, requestLogger
   │   │   ├── models/      # User, Author, Book, Ticket, Message, InternalNote
   │   │   ├── routes/      # Express API routers
   │   │   ├── seeds/       # seed.js (imports dataset, creates demo users)
   │   │   ├── sockets/     # socketServer.js (authenticated rooms & events)
   │   │   ├── utils/       # logger, apiResponse envelopes
   │   │   └── validators/  # Zod validation schemas
   │   ├── tests/
   │   ├── package.json
   │   └── server.js
   ├── docs/
   │   ├── assets/
   │   │   ├── BookLeaf Technical Assignment.pdf
   │   │   └── BookLeaf Sample Data.json
   │   ├── architecture.md
   │   ├── approach-writeup.md
   │   ├── requirements-extraction.md
   │   └── assumptions.md
   ├── README.md
   └── .gitignore
   ```
2. **Security & Resilience:**
   - Helmet security headers, CORS with explicit production allowlist.
   - Rate limiting on public and sensitive routes (especially login and AI endpoints).
   - Centralized error handling middleware with unified response envelope:
     ```json
     {
       "success": false,
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Human readable explanation",
         "details": []
       }
     }
     ```
   - Standardized success response envelope:
     ```json
     {
       "success": true,
       "data": {}
     }
     ```
   - JWT tokens signed with secure secret, containing `userId`, `role`, and `authorId` (if author).
   - Password hashing with bcrypt (salt rounds >= 10).
   - Environment variables for all secrets; never exposed to frontend.

---

### 5. AI System Requirements (25% Weight)

1. **Model:** `gpt-4o-mini` via OpenAI API (configurable via `OPENAI_API_KEY`).
2. **Dedicated Modular Service (`backend/src/ai/`):**
   - **Structured Prompts:**
     - `classificationAndPriorityPrompt`: Combines category identification and 4-level severity scoring into one structured call using JSON response format.
     - `responseDraftPrompt`: Generates empathetic, factual responses using matched Knowledge Base sections and ticket history.
   - **Validation:** Zod schema parsing on AI outputs before database persistence.
   - **Fallback & Repair:** On malformed JSON, retry once with a correction prompt. If still failing or API is down, mark `aiStatus: 'failed'`, `classificationSource: 'pending'`, allowing manual admin processing without blocking ticket creation.
   - **Cost Consciousness:**
     - Low temperature (0.1 - 0.2) and bounded max tokens for classification.
     - Prompt injection defenses: Delimit author input with markdown fences and explicit system directives.
     - Selective KB injection: Include only the relevant KB topic modules (matched by keyword/category) rather than the entire document.
     - Response caching: In-memory cache keyed by `ticketId + lastMessageId`.
     - Rate-limit and cooldown on draft regeneration.

---

### 6. Classification Categories (Exact Six)
1. **Royalty & Payments:** Inquiries on royalty calculations, 80/20 split, net profit deductions, quarterly payout cycles, minimum ₹1,000 threshold, bank transfers, or missing payouts.
2. **ISBN & Metadata Issues:** Issues regarding BookLeaf-assigned ISBNs, imprint questions, ISBN barcode mismatches on Amazon/Flipkart, title/metadata updates.
3. **Printing & Quality:** Paper quality, print defects, misprints, binding issues, cover finish, color inconsistencies, reprints, and author copy deliveries.
4. **Distribution & Availability:** Book listings on Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store, "Currently Unavailable" status, stock synchronization (24-48h).
5. **Book Status & Production Updates:** Inquiries regarding books in production (Manuscript Received, Editing, Cover Design, Typesetting, Proofreading, ISBN Assignment, Printing, Distribution Setup, Published & Live).
6. **General Inquiry:** Author account updates, author bio revisions, general publishing package questions (Standard Free vs Bestseller Breakthrough), general queries not matching other categories.

---

### 7. Priority Matrix (Exact Four)
- **Critical:** Urgent financial issues (e.g. overdue royalty unpaid for multiple quarters with > ₹1,000 accumulated), severe quality disaster impacting widespread customer orders.
- **High:** ISBN discrepancies (escalated to production per BookLeaf policy), live book showing unavailable on major distribution platforms for prolonged periods, significant printing defects on author copies.
- **Medium:** Standard royalty calculation queries, production timeline inquiries for books currently in editing/typesetting/cover design, routine distribution sync requests.
- **Low:** General author bio updates, minor metadata change questions, basic policy clarifications.

---

### 8. Ticket Status Lifecycle (Exact Four)
- `Open`: Newly created ticket, awaiting first admin review.
- `In Progress`: Admin has viewed, assigned, drafted, or replied to the ticket; conversation active.
- `Resolved`: Issue addressed by admin response and marked resolved.
- `Closed`: Ticket archived with no further action required.
*(Note: If an author sends a message on a `Resolved` ticket, it automatically transitions back to `In Progress`.)*

---

### 9. BookLeaf Knowledge Base Policies (Exact)
1. **Company Overview:** Self-publishing company in India and the US. Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, marketing & distribution add-ons). In-house printing facility and warehouse in Delhi; print partners include Repro India and Epitome Books.
2. **Royalty Policy:**
   - 80/20 split: 80% net profit to author, 20% to BookLeaf.
   - Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
   - Calculated quarterly, paid within 45 days after quarter ending.
   - Minimum payout threshold: ₹1,000. Below ₹1,000 rolls over to next quarter.
   - Bank transfer to linked account in dashboard.
   - Detailed sales breakdowns per platform visible in dashboard.
3. **ISBN Policy:**
   - Unique ISBN assigned by BookLeaf under BookLeaf's publisher imprint.
   - Author wanting their own imprint must procure ISBN independently.
   - ISBN errors (duplicate, wrong book linked) are **high priority** and escalated directly to production team.
4. **Printing & Quality Policy:**
   - In-house printing handles most orders; overflow or specific format requirements go to Repro India or Epitome Books.
   - Standard print turnaround: 5–7 business days from order confirmation.
   - Quality defects (misprints, binding defects, color inconsistency): Free reprint arranged after verification; author may be requested to share photos.
5. **Distribution & Availability Policy:**
   - Channels: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
   - New listings live within 7–10 business days after publication is complete.
   - Stock sync issue ("Currently Unavailable"): BookLeaf triggers re-sync within 24–48 hours.
6. **Production Stages (in exact sequence):**
   1. Manuscript Received
   2. Editing (if opted)
   3. Cover Design
   4. Typesetting
   5. Proofreading
   6. ISBN Assignment
   7. Printing
   8. Distribution Setup
   9. Published & Live
   - Authors updated at each stage via email. Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).
7. **Metadata Updates:** Reflect on platforms within 3–5 business days.
8. **Communication Tone Guidelines:**
   - Empathetic and professional; authors are partners, not customers to be managed.
   - Acknowledge author concern before jumping into solutions.
   - Specific details: include actual numbers, dates, and statuses.
   - Direct accountability: If BookLeaf is at fault (delayed royalties, ISBN error), own it directly without corporate deflection.
   - Concrete timelines: provide clear escalation resolution windows (e.g., "within 48 hours", "5-7 business days for reprints").
   - Clear next steps: always end with a clear action item for author or BookLeaf team.

---

### 10. Sample Dataset Schema & Types Extraction

From `docs/assets/BookLeaf Sample Data.json`:
- **Root Object:**
  - `authors`: Array of 10 Author objects.
- **Author Entity Fields:**
  - `author_id`: String (e.g. `"AUTH001"`)
  - `name`: String (e.g. `"Priya Sharma"`)
  - `email`: String (e.g. `"priya.sharma@email.com"`)
  - `phone`: String (e.g. `"+91-98765-43210"`)
  - `city`: String (e.g. `"Mumbai"`)
  - `joined_date`: String / ISO Date (e.g. `"2023-03-15"`)
  - `books`: Array of Book objects (nested in JSON; modeled as referenced or embedded in Mongoose)
- **Book Entity Fields:**
  - `book_id`: String (e.g. `"BK001"`)
  - `title`: String (e.g. `"Whispers of the Ganges"`)
  - `isbn`: String (e.g. `"978-93-5XXXX-01-1"`)
  - `genre`: String (e.g. `"Literary Fiction"`)
  - `publication_date`: String or `null` (e.g. `"2023-06-20"`, `null` for in-production books)
  - `status`: String (e.g. `"Published & Live"`, `"In Production - Cover Design"`, `"In Production - Typesetting"`)
  - `mrp`: Number or `null` (e.g. `399`, `null` for in-production books)
  - `author_royalty_per_copy`: Number or `null` (e.g. `35`, `null` for in-production books)
  - `total_copies_sold`: Number (e.g. `342`, `0` for in-production)
  - `total_royalty_earned`: Number (e.g. `11970`, `0` for in-production)
  - `royalty_paid`: Number (e.g. `8400`, `0` for in-production)
  - `royalty_pending`: Number (e.g. `3570`, `0` for in-production)
  - `last_royalty_payout_date`: String or `null` (e.g. `"2025-10-15"`, `null` if no payouts yet)
  - `print_partner`: String or `null` (e.g. `"In-House"`, `"Repro India"`, `"Epitome Books"`, `null` for in-production)
  - `available_on`: Array of Strings (e.g. `["Amazon India", "Flipkart", "BookLeaf Store"]`, `[]` for in-production)
