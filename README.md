# TrustLine

**Anonymous whistleblowing platform for organisations.**  
Employees report concerns via a private magic link — managers review and act in a secure dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Security Decisions](#security-decisions)
5. [MVP Tradeoffs](#mvp-tradeoffs)
6. [Running Locally](#running-locally)
7. [Testing the App](#testing-the-app)
8. [Project Structure](#project-structure)

---

## Overview

TrustLine is a multi-tenant SaaS that gives every organisation a unique, unguessable reporting link. Employees submit concerns anonymously or with contact details. Managers log in to a protected dashboard to track report status and see unread counts updated via lightweight polling.

Built as a focused MVP for a coding challenge. The goal was a production-shaped architecture with sensible security defaults, not feature completeness.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│   /                  /report/[token]        /login   /dashboard    │
│   Landing Page       Public Report Form     Auth     Manager UI    │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                 │           │
         ▼            Next.js App Router        ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 Server                             │
│                                                                     │
│  POST /api/reports        public, token → companyId                │
│  GET  /api/reports        authenticated, JWT-scoped                │
│  PATCH /api/reports/[id]  status + isRead, compound filter guard   │
│  GET  /api/reports/unread-count  lightweight poll endpoint         │
│                                                                     │
│  Auth.js v5 (JWT) — Credentials provider, companyId in token       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Mongoose
┌──────────────────────────────▼──────────────────────────────────────┐
│                         MongoDB                                     │
│                                                                     │
│  companies   magicLinkToken (unique, 256-bit random)               │
│  users       passwordHash (bcrypt, 12 rounds)                      │
│  reports     companyId · title · description · category            │
│              status (new|in_review|resolved) · isRead · timestamps │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server components + API routes in one deploy target |
| Language | **TypeScript 5** strict | Catches data shape mismatches across the client/server boundary |
| Auth | **Auth.js v5** Credentials + JWT | Official Next.js auth library; stateless JWT avoids a DB round-trip per request |
| Database | **MongoDB** + **Mongoose 9** | Flexible schema ideal for evolving report fields |
| Validation | **Zod 4** | Single schema shared by the client form and the API route — no duplication |
| Forms | **React Hook Form 7** | Performant uncontrolled form state with Zod resolver |
| UI | **shadcn/ui** + **Tailwind v4** | Copy-paste accessible components, zero runtime CSS-in-JS |

---

## Security Decisions

**Magic link token**  
`randomBytes(32).toString("hex")` — 256 bits of entropy. The `companyId` is never sent to or received from the client; it is resolved server-side from the token on every submission.

**Cross-company data isolation**  
All report queries and mutations filter on `{ _id, companyId }`. A manager cannot read or modify another company's reports even with a valid ObjectId. `companyId` always comes from the verified JWT, never from request input.

**Password storage**  
bcrypt with 12 salt rounds in a Mongoose pre-save hook. `passwordHash` is stripped from `toJSON` via destructuring (not `delete`, which is disallowed under `exactOptionalPropertyTypes`).

**Session security**  
Stateless JWT — no sessions collection. `AUTH_URL` + `AUTH_TRUST_HOST` are required to prevent Auth.js v5's `UntrustedHost` error in development.

**Mongoose out of the client bundle**  
Status constants shared between Mongoose models and client components live in `src/lib/constants/report.ts` — zero Node.js dependencies, so Mongoose never enters the browser bundle.

---

## MVP Tradeoffs

| Decision | What was chosen | What was deferred |
|---|---|---|
| Notifications | 30 s `setInterval` polling | WebSocket / SSE real-time push |
| Report detail | Inline status update in table row | Full `/dashboard/reports/[id]` page |
| Auth roles | Single manager role per company | Admin super-role, auditor read-only |
| Email delivery | Magic link displayed in sidebar (copy/paste) | Transactional email via Resend / SendGrid |
| Rate limiting | None | Per-IP limits on report submission and login |
| Pagination | All reports loaded at once | Cursor-based pagination |
| File uploads | Not implemented | S3 pre-signed URL evidence uploads |
| Encryption | Plaintext fields | Field-level encryption for sensitive content |

---

## Running Locally

### Prerequisites

- **Node.js 20+**
- **Docker Desktop**

### 1 · Clone and install

```bash
git clone <repo-url>
cd trustline
npm install
```

### 2 · Create `.env` (Docker credentials)

The `docker-compose.yml` reads credentials from a `.env` file in the project root. Create it:

```env
MONGO_ROOT_USER=trustline_root
MONGO_ROOT_PASSWORD=trustline_dev_secret
MONGO_DB_NAME=trustline
```

### 3 · Start MongoDB

```bash
docker compose up -d
```

The container is named `trustline_mongodb` and exposes MongoDB on `localhost:27017`. It includes a healthcheck — wait a few seconds after starting before running the seed.

```bash
# Optional: confirm the container is healthy
docker compose ps
```

### 4 · Create `.env.local`

```env
# MongoDB — matches docker-compose credentials
MONGODB_URI=mongodb://trustline_root:trustline_dev_secret@localhost:27017/trustline?authSource=admin

# Auth.js — generate with: openssl rand -base64 32
AUTH_SECRET=your_random_secret_here

# Required for Auth.js v5 in development
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Used to construct magic link URLs in the dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5 · Seed demo data

```bash
npm run seed
```

Creates 3 companies, 3 manager accounts, and 12 sample reports (4 per company).

### 6 · Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Testing the App

The seed script creates three fully isolated companies. Use the steps below to walk through every role in the system.

### Seeded manager credentials

All three accounts share the same password.

| Company | Email | Password |
|---|---|---|
| Acme Corporation | `manager@acme.dev` | `TrustLine2026!` |
| Globex Industries | `manager@globex.dev` | `TrustLine2026!` |
| Initech Solutions | `manager@initech.dev` | `TrustLine2026!` |

---

### Step 1 — Log in as a manager

1. Go to <http://localhost:3000/login>
2. Enter any credentials above, e.g. `manager@acme.dev` / `TrustLine2026!`
3. You are redirected to the dashboard at `/dashboard`

---

### Step 2 — Find the company's reporting URL

Each company gets a unique reporting URL containing a **slug + random suffix** (e.g. `acme-corporation-a3f8c2d1`). The token is generated fresh every time `npm run seed` runs, so there is no fixed URL to hardcode.

**Two ways to get the URL:**

**Option A — From the seed output (easiest)**  
`npm run seed` prints all URLs at the end of its output:

```
  REPORTING URLS (paste in an incognito window to submit a report)
  ────────────────────────────────────────────────────────────
  Acme Corporation
  http://localhost:3000/report/acme-corporation-a3f8c2d1

  Globex Industries
  http://localhost:3000/report/globex-industries-9d1e7432
  ...
```

Copy any URL directly from the terminal.

**Option B — From the dashboard sidebar**  
Log in as a manager → the **Magic Link** widget in the sidebar shows the URL for that company with a **Copy** button.

---

### Step 3 — Submit a report as an employee

1. Open a **private / incognito window** (so you are not logged in as the manager)
2. Paste the magic link URL and press Enter
3. You will see the public **Report a Concern** form, branded with the company name
4. Fill in the form:

| Field | Example value |
|---|---|
| Title | `Expense fraud in Q4` |
| Description | `I noticed discrepancies in the marketing team's expense claims over the last three months...` |
| Category | Financial |
| Anonymous | Leave checked for anonymous submission; uncheck to add a contact email |

5. Click **Submit Report** — you should see a success confirmation

---

### Step 4 — Watch the unread badge appear

Switch back to the manager dashboard window. Within **30 seconds** a count badge appears next to **Reports** in the sidebar. Refreshing immediately also works.

---

### Step 5 — Manage reports in the dashboard

In the Reports table:

- **Unread rows** have a faint blue background and a filled dot beside the title
- **Click the title** to mark the report as read (instant optimistic update — no page reload)
- Use the **Status dropdown** to move a report through its lifecycle:
  `New` → `In Review` → `Resolved`  
  Changing the status also marks the report as read automatically

---

### Seeded report data

Each company starts with four reports covering different statuses and categories:

| Title | Category | Status | Anonymous |
|---|---|---|---|
| Falsified expense reports in Q4 | Financial | New | Yes |
| Hostile work environment in engineering | HR | In Review | No |
| Safety equipment violations on floor 3 | Safety | Resolved | Yes |
| Bid-rigging with external vendor | Compliance | New | No |

Categories rotate through all five types (Financial, HR, Safety, Compliance, Other) across the three companies.

---

### Verify data isolation

1. Log in as `manager@acme.dev` and note the report titles
2. **Sign out** (button at the bottom of the sidebar)
3. Log in as `manager@globex.dev` — a completely separate set of reports is shown

The API enforces isolation at the query layer: `companyId` always comes from the verified JWT, never from user-supplied input.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js handler
│   │   └── reports/
│   │       ├── route.ts          # GET (list) + POST (submit)
│   │       ├── [id]/route.ts     # PATCH (status + isRead)
│   │       └── unread-count/     # GET (badge polling)
│   ├── dashboard/
│   │   ├── layout.tsx            # Auth guard + sidebar
│   │   ├── page.tsx              # Reports list (server component)
│   │   └── _components/
│   │       ├── ReportsTable.tsx  # Unread indicators + status update
│   │       ├── UnreadBadge.tsx   # 30 s polling badge
│   │       ├── MagicLinkDisplay.tsx
│   │       └── SignOutButton.tsx
│   ├── login/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── report/[token]/
│   │   ├── page.tsx              # Token validation (server)
│   │   ├── ReportForm.tsx        # RHF + Zod form (client)
│   │   └── actions.ts
│   └── page.tsx                  # Landing page
├── auth.ts                       # Auth.js config
├── lib/
│   ├── constants/report.ts       # Browser-safe status constants
│   ├── mongodb.ts                # Mongoose singleton
│   └── validations/report.ts     # Shared Zod schema
├── models/
│   ├── Company.ts
│   ├── User.ts
│   └── Report.ts
└── types/
    └── report.ts                 # ReportRow serialised for client
```

---

## License

MIT
