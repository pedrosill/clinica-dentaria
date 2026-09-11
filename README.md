# DentalPro Clinic Management System

DentalPro is a dental clinic management system for patient records and appointment scheduling. The project uses a React + Vite + Tailwind CSS frontend and a Node.js + Express + Prisma + SQLite backend. [file:16]

## Tech stack

- Frontend: React 19, Vite 8, Tailwind CSS v4. [file:16]
- Backend: Node.js, Express 5, Prisma ORM, SQLite. [file:16]
- Monorepo tooling: `concurrently` for running client and server together. [file:16]

## Project structure

```text
clinica-dentaria/
├── client/     # React frontend
├── server/     # Express + Prisma backend
└── package.json
```

The frontend runs on port 5173 and the backend runs on port 5000 in development. [file:16]

## Prerequisites

- Node.js 22.12+ recommended
- npm

## Install dependencies

Install dependencies at the root, then for the client and server workspaces.

```bash
npm install
npm install --prefix client
npm install --prefix server
```

## Environment setup

Copy `server/.env.example` to `server/.env`. The backend uses SQLite and expects this database URL:

```env
DATABASE_URL="file:./dev.db"
```

This matches the Prisma SQLite configuration documented in the project context. [file:16]

Copy `client/.env.example` to `client/.env` if the API is not running at the default URL:

```env
VITE_API_BASE_URL="http://localhost:5000"
```

Set this value to the deployed backend URL for production builds.

## Run in development

From the project root:

```bash
npm run dev
```

This starts:
- the backend server on `http://localhost:5000` [file:16]
- the frontend Vite app on `http://localhost:5173` [file:16]

## Run services separately

### Frontend

```bash
npm run dev --prefix client
```

### Backend

```bash
npm run dev --prefix server
```

## Seed the database

To reset and seed the SQLite database with development data:

```bash
npm run seed --prefix server
```

The seed includes 5 patients and 17 appointments in October 2026. [file:16]

## Default administrator

In development, startup creates one administrator automatically when the database has no users:

```text
Email: admin@dentalpro.local
Password: DentalProAdmin123!
```

The account is created only once and is not duplicated on later restarts. You can override the development values with `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_NAME`, and `DEFAULT_ADMIN_PASSWORD` in `server/.env`.

For production, startup provisioning is disabled and `CREATE_DEFAULT_ADMIN=true` is rejected. Create an administrator interactively while the server is stopped instead:

```bash
npm run admin:create --prefix server
```

The development defaults are never used by a production startup.

## Production operations

Set `NODE_ENV=production`, an explicit HTTPS `CLIENT_ORIGIN`, `TRUST_PROXY` with the proxy's IP/CIDR (or `loopback` when the proxy is local), and a SQLite `DATABASE_URL`. The server refuses production startup when these values are missing or unsafe. TLS termination must be configured at the trusted proxy; the application sets secure session/CSRF cookies only for HTTPS production traffic.

All state-changing requests require both a permitted `Origin`/`Referer` and a CSRF token. The current frontend obtains the token automatically; other clients must first call `GET /api/auth/csrf`, retain the returned token and cookie, and send `X-CSRF-Token` on `POST`, `PUT`, `PATCH`, and `DELETE` requests.

### SQLite backup and restore

Backups use SQLite's online backup API, so the source is copied consistently while the application may be running. Run them from the repository root or `server/`:

```bash
npm run db:backup --prefix server
npm run db:restore --prefix server -- server/backups/dentalpro-...db.enc --target file:./restored.db
```

`BACKUP_DIR` selects the destination and `BACKUP_RETENTION_COUNT` controls how many matching backups remain (default: 7). Set `BACKUP_ENCRYPTION_KEY` or `BACKUP_ENCRYPTION_KEY_FILE` to enable AES-256-GCM encryption; encryption is mandatory when `NODE_ENV=production`. Keep the key outside the repository and do not assume a cloud provider. A restore validates SQLite integrity and foreign-key consistency before replacing the target. Pass `--replace` for an existing target, stop the server first, and retain the generated `.pre-restore-*.db` safety copy until the restore is accepted.

The operational checklist, scheduling recommendation, and restore drill are documented in [`docs/OPERATIONS_BACKUP.md`](docs/OPERATIONS_BACKUP.md).

## Build the frontend

```bash
npm run build --prefix client
```

## Preview the frontend build

```bash
npm run preview --prefix client
```

## Root scripts

```bash
npm run dev
npm run start
```

According to the project context, the root `dev` command runs both services together, and the root `start` command builds the client, runs preview, and starts the server. [file:16]

## Current scope

The project is currently in active development and includes:
- patient and doctor management
- appointment creation, availability, rescheduling, and status workflows
- dashboard and agenda pages
- authenticated role-based access
- configurable clinic hours, breaks, closures, provider schedules, and appointment types
- patient clinical profiles, an interactive FDI odontogram, clinical notes, and treatment plans
- SQLite development data seeding. [file:16]

Billing, patient reminders, and patient-portal features remain future-version work. Clinical imaging, periodontal charting, prescriptions, and external communication integrations remain future extensions. [file:16]
