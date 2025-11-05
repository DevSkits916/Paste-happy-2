# Paste Happy Pro Monorepo

A monorepo that powers Paste Happy Pro, containing a React web application, an Express API, and a shared Prisma database package.

## Structure

```
paste-happy-pro/
├── apps/
│   ├── api/   # Express + TypeScript REST API
│   └── web/   # React + Vite + TypeScript frontend
└── packages/
    └── db/    # Prisma schema and generated client
```

## Requirements

- Node.js 20+
- Yarn Classic (v1)
- PostgreSQL database for Prisma

## Getting Started

Install dependencies across all workspaces:

```bash
yarn install
```

### Environment Variables

Copy the provided `.env.example` files and adjust the values for your environment.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Populate the API `.env` with your `DATABASE_URL` and `JWT_SECRET`. The web app `.env` controls the API base URL the frontend uses at runtime.

### Database (Prisma)

Generate the Prisma client and run the initial migration once your database is reachable:

```bash
yarn --cwd packages/db prisma:generate
yarn --cwd packages/db prisma:migrate
```

This will create the tables defined in `packages/db/prisma/schema.prisma` and generate the shared TypeScript client.

### Development

Run the API and web app together with hot-reload:

```bash
yarn dev
```

You can also run them individually:

```bash
yarn dev:api
# in another terminal
yarn dev:web
```

The API listens on `http://localhost:4000` by default and exposes routes such as `/health`, `/auth/dev-login`, `/queue`, `/templates`, and `/logs`. The web app runs on Vite's default port `5173`.

### Building for Production

```bash
yarn build
```

This command builds the API (TypeScript -> JavaScript) and the Vite frontend for deployment.

## API Overview

- `GET /health` – health check.
- `POST /auth/dev-login` – temporary developer login endpoint issuing a JWT and creating users on the fly.
- `GET|POST|PUT /queue` – manage queue entries for group outreach.
- `GET|POST|PUT|DELETE /templates` – CRUD for reusable outreach templates.
- `GET /logs` – retrieve posting logs.

All protected routes require a `Bearer` token returned from the dev login endpoint.

## Frontend Highlights

- Zustand-powered global store for API configuration and queue filters.
- Mobile-first layout without heavy UI libraries.
- Queue management with CSV import helpers and quick action buttons.
- Template editor with live placeholder preview.
- Page posting composer stub ready for future integrations.

## Scripts Reference

- `yarn dev` – run API + web concurrently.
- `yarn dev:api` – run API only.
- `yarn dev:web` – run web app only.
- `yarn build` – build both API and web packages.

Feel free to extend the tooling with linting, testing, and deployment workflows as the project evolves.
