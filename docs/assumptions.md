# BookLeaf Author Support Portal - Assumptions & Conflict Log

This document records all design assumptions, edge case treatments, and reconciliations between the technical project brief and the specification document (`docs/assets/BookLeaf Technical Assignment.pdf`).

---

## 1. Specification Precedence & Conflict Reconciliations

| Topic | Project Brief Statement | PDF Specification | Resolved Approach & Rationale |
| :--- | :--- | :--- | :--- |
| **Ticket Statuses** | Section 4: "use the PDF's exact statuses". Section 7.B: "open / in-progress / resolved counts" | Page 2 explicitly lists: `(Open, In Progress, Resolved, Closed)` | We adopt the exact 4 statuses: `Open`, `In Progress`, `Resolved`, `Closed`. |
| **Ticket Priority Levels** | Critical, High, Medium, Low | Page 3: `(Critical / High / Medium / Low)` | Both documents align perfectly. |
| **Categories** | Six specific categories | Page 3: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry` | Both documents align perfectly. |
| **AI Model Choice** | Mentions `gpt-4o-mini` | Page 4: "You may use OpenAI, Anthropic, or any other LLM API you prefer." Page 8 recommends `gpt-4o-mini` | We use `gpt-4o-mini` via OpenAI API, with full architectural isolation so switching models or providers is configured via environment variables. |
| **Sample Data Structure** | Section 4 notes: "preserve nulls as null" and "never fabricate, rename, 'fix' or replace author or book records" | Page 8 specifies seeding with the exact provided JSON | The sample dataset is ingested verbatim. `Author` and `Book` entities retain exact field naming (`author_id`, `book_id`, `joined_date`, `author_royalty_per_copy`, etc.) with Mongoose schema fidelity. |

---

## 2. Architectural & Business Assumptions

### A. Author Data Isolation & Ownership
- Authors are strictly scoped by the `authorId` extracted securely from their verified JWT token.
- Any attempt to access a book or ticket belonging to another author responds with HTTP `404 Not Found` (rather than `403 Forbidden`) to prevent enumeration attacks and avoid leaking the existence of other records.

### B. Ticket Lifecycle & Reopening
- When a ticket is created by an author, its initial status is `Open`.
- When an admin posts a message or assigns the ticket, status updates to `In Progress`.
- When an admin marks an issue as `Resolved`, it moves to `Resolved`.
- **Reopening Rule:** If an author posts a follow-up message on a `Resolved` ticket, the ticket status automatically re-opens to `In Progress`, triggering a real-time event to the admin dashboard.
- If a ticket is marked `Closed`, no further author messages can be appended unless reopened by an admin.

### C. Financial Calculations & Null Values
- Authors have books with differing financial statuses:
  - Some books have null `mrp` and null `author_royalty_per_copy` because they are currently in production.
  - Some books have `royalty_pending: 0` because all royalties have been paid.
  - Some books have pending royalties below the ₹1,000 threshold (e.g. `BK016` has ₹850 pending), which according to BookLeaf policy rolls over to the next quarter.
- **Aggregation Rules:**
  - `total_royalty_earned` = sum of numeric `total_royalty_earned` across author's books.
  - `total_royalty_paid` = sum of numeric `royalty_paid` across author's books.
  - `total_royalty_pending` = sum of numeric `royalty_pending` across author's books.
  - Null financial values (e.g., MRP for an in-production title) are rendered in the UI as `"Not available"` or `"In Production"`, never as a misleading `₹0`.

### D. File Attachments
- As clarified in PDF page 2 ("UI only—actual upload is bonus, not required"), the ticket submission form supports attachment metadata (file name, size, type) and simulated upload states with preview, avoiding external S3 bucket requirements for local and evaluation runs.

### E. AI Service Fallback & Prompt Hardening
- If `OPENAI_API_KEY` is not configured, or if the OpenAI API returns rate limits, timeouts, or 5xx errors:
  - The ticket creation process **never fails**. The ticket is created with `aiStatus: 'failed'` and `classificationSource: 'pending'`.
  - The Admin UI clearly indicates AI unavailability and invites the operator to manually assign the category and priority.
- Prompts use explicit delimiter guards (`<<<AUTHOR_QUERY>>> ... <<<END_QUERY>>>`) and strict instructions to prevent prompt-injection attacks from malicious ticket text.
- Outputs are validated with Zod schemas. If the model produces invalid JSON, a single auto-repair retry is attempted before failing gracefully.

### F. Internal Notes Security
- Admin internal notes are saved to an isolated collection (`InternalNotes`).
- No author API endpoint ever reads from or joins with `InternalNotes`.
- Socket.io broadcasts for internal notes are emitted exclusively to the `admins` room.
- AI drafting prompts by default do not receive internal notes unless explicitly designated, protecting sensitive ops discussions.
