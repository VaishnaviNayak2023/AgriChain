# AgriChain Trust

AgriChain Trust is organized as an npm workspace with a separate React frontend and Express backend.

## Requirements

- Node.js 22.13 or newer
- npm 10 or newer

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

The frontend is at `http://127.0.0.1:5173`. The backend listens at `http://127.0.0.1:4000`; Vite proxies `/api` and `/uploads` to it, so the browser uses same-origin session cookies and image URLs. The API creates `backend/data/agrichain.sqlite` on first start. Set `DATABASE_PATH` to change the database location.

To run one service on its own, use `npm run dev --workspace frontend` or `npm run dev --workspace backend` from the root.

## Authentication API

- `POST /api/auth/register`: create an account, hash its password, and issue a session.
- `POST /api/auth/login`: verify credentials and issue an 8-hour session, or a 30-day session when Remember me is selected.
- `GET /api/auth/me`: return the user associated with the current session.
- `POST /api/auth/logout`: revoke the current session and clear its cookie.
- `GET /api/health`: basic API health check.

Passwords are bcrypt-hashed. The browser receives only a random opaque token in an HTTP-only, SameSite=Lax cookie; the database stores only its SHA-256 hash. Production deployments must serve the frontend and `/api` over HTTPS and route `/api` to the backend, which enables secure cookies automatically when `NODE_ENV=production`.

## Farmer dashboard API

All `/api/dashboard/*` endpoints require a farmer session and scope queries and mutations to that farmer's account.

- `GET /api/dashboard/overview`: aggregates profile, KPI totals, recent batches, AI result when present, activities, six-month performance, location, and integration readiness.
- `GET|POST /api/dashboard/batches`, `PUT|DELETE /api/dashboard/batches/:id`: search, filter, paginate, create, update, and delete owned batches.
- `POST /api/dashboard/uploads`: accepts one JPG, PNG, WebP, or AVIF image up to 5 MB. Development files are stored under `backend/data/uploads` and served through `/uploads`.
- `GET /api/dashboard/analytics/monthly-performance`, `/quality-distribution`, `/revenue`: SQLite aggregates from recorded batch and sale data.
- `GET /api/dashboard/activity`, `GET|PUT /api/dashboard/farm/location` and `/profile`: account activity and farmer profile/location data.
- `POST /api/dashboard/batches/:id/analyze`: forwards an uploaded image to the configured AI service, validates its response, then saves the analysis and batch scores. It returns `503` when no AI service is configured.
- `GET /api/dashboard/passports`, `POST /api/dashboard/batches/:id/passport`, `GET /api/public/passports/:publicId`: generate and look up QR passports only after a batch has a persisted verified status and blockchain transaction hash.

Empty accounts show zero counts, null/not-scored measurements, and empty lists. The frontend contains no dashboard fixture arrays or fallback sample scores. Farmer-created records populate the aggregates. Verification cannot be assigned through the farmer batch editor; it must come from a trusted integration.

To demonstrate the dashboard with development records, first create a farmer account and then run `npm run seed:dev --workspace backend -- farmer@example.com` from the repository root. The script refuses production and leaves any farmer who already has batches unchanged. Seeded records do not include fabricated AI scores or blockchain hashes.

## Integrations and storage

The workspace retains its existing Vite/React, Express, and SQLite stack. It does not currently use Next.js or MongoDB Atlas. No Atlas URI or external provider credentials were available in this environment, so there is no claim that those services are connected. AI analysis can be enabled with `AI_SERVICE_URL` (and optional `AI_SERVICE_TOKEN`); production Polygon verification and Cloudinary storage still require their provider-specific implementation/configuration. Local image uploads are a development storage path, not a Cloudinary substitute for production deployment.

## Project layout

- `frontend/src`: homepage, auth screens, farmer dashboard, charts, and typed API clients.
- `frontend/vite.config.ts`: local `/api` and `/uploads` proxies.
- `backend/src/routes`: HTTP routes.
- `backend/src/services`: auth, dashboard aggregates, batch behavior, and local image storage.
- `backend/src/middleware`: session authentication and cookie handling.
- `backend/src/schemas`: request validation.
- `backend/src/db`: SQLite schema and connection.
- `backend/src/integrations`: provider integration boundary and setup notes.
- `backend/test`: auth, owner isolation, empty states, batch CRUD, activity, upload, and integration-boundary tests using an isolated in-memory database.

External sign-in, email OTP, and other provider connections are intentionally not advertised as working until their credentials and callback URLs are configured.

## Checks

```sh
npm run build
npm run lint
npm test
```
