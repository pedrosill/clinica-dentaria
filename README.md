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

The backend uses SQLite and expects this database URL in `server/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

This matches the Prisma SQLite configuration documented in the project context. [file:16]

The frontend accepts an optional API base URL in `client/.env`:

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
- patient create/read support
- appointment create/read support
- dashboard and agenda pages
- SQLite development data seeding. [file:16]

Known limitations still remain, including incomplete week/day agenda views, missing update/delete UI flows, and missing authentication. [file:16]
