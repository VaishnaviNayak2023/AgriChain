# AgriChain Trust

AgriChain Trust is an agricultural traceability platform designed to help farmers manage produce batches, record quality information, and generate verifiable digital product passports. The project combines a modern React frontend, an Express backend, SQLite persistence, AI-assisted analysis integration, and QR-based traceability workflows.

The long-term vision of AgriChain Trust is to provide an explainable, privacy-preserving farm-to-consumer traceability ecosystem that combines blockchain provenance, AI-driven quality assessment, selective disclosure mechanisms, and consumer-facing transparency tools. The current repository implements the application foundation and integration boundaries required to support that future evolution.

---

## Project Vision

Agricultural supply chains often struggle with transparency, authenticity verification, quality assurance, and trust between stakeholders. AgriChain Trust aims to address these challenges through a software-first approach that enables traceability from farm to consumer without requiring specialized IoT devices, RFID tags, or field hardware.

The broader research objective is to enable consumers to scan a single QR code and view a complete farm-to-shelf history while providing farmers, regulators, and supply-chain participants with trustworthy and auditable records.

Future research directions include:

* Blockchain-backed provenance tracking
* Multi-stage AI quality grading
* Privacy-preserving certification verification
* Fraud and anomaly detection
* Explainable consumer provenance timelines
* Regulatory risk analytics
* Hybrid on-chain and off-chain storage architectures

---

## Current Repository Scope

The current repository provides:

* Farmer account registration and authentication
* Session-based security
* Batch creation and management
* Batch analytics and reporting
* Image upload support
* AI analysis integration boundary
* QR passport generation workflows
* Farmer dashboard and profile management
* SQLite-based data persistence
* Comprehensive API and integration tests

The repository does **not currently implement**:

* Production blockchain integration
* NFT-based produce passports
* Zero-knowledge proofs
* IPFS storage
* Token systems
* Smart-contract compliance validation
* On-chain fraud detection
* Cloudinary production storage

These capabilities remain future roadmap items and should not be assumed to be operational unless explicitly documented and implemented.

---

# Technology Stack

## Frontend

* React
* TypeScript
* Vite

## Backend

* Node.js
* Express
* SQLite

## Testing

* Backend integration and API tests
* Isolated in-memory test database

## Optional Integrations

* AI quality analysis service
* Future blockchain integrations
* Future decentralized storage providers

---

# Requirements

* Node.js 22.13 or newer
* npm 10 or newer

---

# Installation

Clone the repository and install dependencies from the workspace root:

```sh
npm install
```

---

# Running Locally

Start both frontend and backend:

```sh
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:4000
```

Vite automatically proxies:

```text
/api
/uploads
```

to the backend server, allowing the browser to use same-origin session cookies and image URLs.

---

## Running Individual Services

Frontend only:

```sh
npm run dev --workspace frontend
```

Backend only:

```sh
npm run dev --workspace backend
```

---

# Database

The backend automatically creates:

```text
backend/data/agrichain.sqlite
```

on first startup.

To use a custom database location:

```sh
DATABASE_PATH=/path/to/database.sqlite
```

---

# Authentication

AgriChain Trust uses session-based authentication.

Features include:

* Account registration
* Secure login
* Session validation
* Logout support
* Remember-me functionality

Passwords are hashed using bcrypt.

Session cookies contain only an opaque token while the database stores a SHA-256 hash of the token.

Session durations:

| Session Type   | Duration |
| -------------- | -------- |
| Standard Login | 8 Hours  |
| Remember Me    | 30 Days  |

Production deployments automatically enable secure cookies when:

```sh
NODE_ENV=production
```

and the application is served through HTTPS.

---

# Authentication API

## Register

```http
POST /api/auth/register
```

Creates a new account and issues a session.

---

## Login

```http
POST /api/auth/login
```

Verifies credentials and issues a session.

---

## Current User

```http
GET /api/auth/me
```

Returns the currently authenticated user.

---

## Logout

```http
POST /api/auth/logout
```

Revokes the active session and clears the authentication cookie.

---

## Health Check

```http
GET /api/health
```

Returns API health information.

---

# Farmer Dashboard

All dashboard endpoints require an authenticated farmer session.

Each request is automatically scoped to the authenticated farmer's account.

---

## Dashboard Overview

```http
GET /api/dashboard/overview
```

Returns:

* Profile information
* KPI summaries
* Recent batches
* AI analysis results
* Activity history
* Six-month performance metrics
* Farm location
* Integration readiness information

---

## Batch Management

### List/Search Batches

```http
GET /api/dashboard/batches
```

### Create Batch

```http
POST /api/dashboard/batches
```

### Update Batch

```http
PUT /api/dashboard/batches/:id
```

### Delete Batch

```http
DELETE /api/dashboard/batches/:id
```

Features include:

* Pagination
* Search
* Filtering
* Ownership isolation

---

## Image Uploads

```http
POST /api/dashboard/uploads
```

Supported formats:

* JPG
* PNG
* WebP
* AVIF

Maximum file size:

```text
5 MB
```

Development uploads are stored in:

```text
backend/data/uploads
```

and served through:

```text
/ uploads
```

---

## Analytics

Monthly Performance:

```http
GET /api/dashboard/analytics/monthly-performance
```

Quality Distribution:

```http
GET /api/dashboard/analytics/quality-distribution
```

Revenue Analytics:

```http
GET /api/dashboard/analytics/revenue
```

Analytics are generated directly from recorded batch and sale data stored in SQLite.

---

## Activity Tracking

```http
GET /api/dashboard/activity
```

Returns account activity history.

---

## Farm Location

Retrieve location:

```http
GET /api/dashboard/farm/location
```

Update location:

```http
PUT /api/dashboard/farm/location
```

---

## Farmer Profile

Retrieve profile:

```http
GET /api/dashboard/profile
```

Update profile:

```http
PUT /api/dashboard/profile
```

---

# AI Analysis Integration

Analyze a batch image:

```http
POST /api/dashboard/batches/:id/analyze
```

The backend:

1. Validates ownership.
2. Sends the uploaded image to a configured AI service.
3. Validates the AI response.
4. Stores the analysis.
5. Updates batch scores.

If no AI service is configured:

```http
503 Service Unavailable
```

is returned.

### Configuration

```sh
AI_SERVICE_URL=<service-url>
AI_SERVICE_TOKEN=<optional-token>
```

---

# Produce Passports

List passports:

```http
GET /api/dashboard/passports
```

Generate passport:

```http
POST /api/dashboard/batches/:id/passport
```

Public lookup:

```http
GET /api/public/passports/:publicId
```

Passport generation requires:

* Persisted verified status
* Blockchain transaction hash

Verification cannot be assigned through the farmer dashboard and must originate from a trusted integration.

---

# Development Seed Data

Create a farmer account first.

Then run:

```sh
npm run seed:dev --workspace backend -- farmer@example.com
```

The seed script:

* Refuses production environments
* Leaves farmers with existing batches unchanged
* Creates realistic development records

Seed data intentionally excludes:

* Fabricated AI scores
* Fabricated blockchain transaction hashes

---

# Empty State Behavior

New farmer accounts return:

* Zero counts
* Empty activity lists
* Empty batch lists
* Empty analytics
* Null scoring fields

No dashboard fixture arrays or hardcoded sample data are used.

All dashboard data originates from farmer-created records.

---

# Integrations and Storage

Current implementation:

* Local SQLite database
* Local image uploads
* AI service integration boundary

Not currently connected:

* MongoDB Atlas
* Next.js
* Polygon
* Hyperledger Fabric
* Ethereum
* Cloudinary

Production blockchain verification and cloud storage require provider-specific implementations and credentials.

---

# Future Research Roadmap

The following capabilities are part of the broader AgriChain Trust research proposal and may be explored in future versions:

### Multi-Checkpoint AI Quality Grading

Repeated quality assessment across:

* Harvest
* Packing
* Retail

to build quality trends over time.

### Dynamic Produce Passports

Digital identities that evolve as supply-chain events occur.

### Selective Disclosure

Privacy-preserving certification verification while protecting commercial information.

### Fraud Detection

Machine-learning models that identify suspicious:

* Pricing anomalies
* Quantity mismatches
* Timing irregularities

### Hybrid Storage

On-chain verification with off-chain document and image storage.

### Explainable Consumer Timelines

Visual farm-to-shelf provenance histories.

### Automated Compliance Verification

Rule-based certification checks through smart contracts.

### Regulator Risk Dashboards

Predictive insights for spoilage and fraud monitoring.

---

# Project Structure

```text
frontend/
├── src/
├── vite.config.ts

backend/
├── src/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── schemas/
│   ├── db/
│   └── integrations/
├── test/

backend/data/
```

---

# Testing and Quality Checks

Build:

```sh
npm run build
```

Lint:

```sh
npm run lint
```

Run Tests:

```sh
npm test
```

The test suite includes:

* Authentication tests
* Session handling tests
* Ownership isolation tests
* Empty state tests
* Batch CRUD tests
* Upload tests
* Activity tracking tests
* Integration boundary tests

---

# License

MIT License
