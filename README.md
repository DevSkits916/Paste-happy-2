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

## Render Deployment Guide

Follow these steps to deploy the monorepo to [Render](https://render.com/):

### 1. Provision Services

1. **Render PostgreSQL (Starter plan)**
   - Create a new PostgreSQL instance.
   - Once provisioned, copy the `DATABASE_URL` from the *Info* tab; you will reference it when configuring the API environment variables.

2. **Web Service: `apps/api`**
   - **Environment**: Node.
   - **Build Command**:
     ```bash
     yarn
     cd packages/db && npx prisma migrate deploy
     cd ../../apps/api && yarn build
     ```
   - **Start Command**:
     ```bash
     node dist/index.js
     ```
   - **Environment Variables**:
     | Key | Value |
     | --- | ----- |
     | `DATABASE_URL` | Paste the connection string from the Render PostgreSQL service. |
     | `JWT_SECRET` | Generate a strong random string (e.g., `openssl rand -hex 32`). |
     | `APP_URL` | `https://<your-api>.onrender.com` (replace with the Web Service host name). |
     | `ENCRYPTION_KEY` | Generate a 32-byte base64 string (e.g., `openssl rand -base64 32`). |

   - Enable the PostgreSQL database as a *Linked Service* to populate `DATABASE_URL` automatically if preferred.

3. **Static Site: `apps/web`**
   - **Build Command**:
     ```bash
     yarn
     cd apps/web && yarn build
     ```
   - **Publish Directory**: `apps/web/dist`
   - **Environment Variables**:
     | Key | Value |
     | --- | ----- |
     | `VITE_API_BASE` | `https://<your-api>.onrender.com` (match the API host name). |

### 2. Facebook App Setup (Summary)

- Create a Facebook App in Meta for Developers and add the **Facebook Login** product only if you need to obtain a user access token for exchanging into a Page token.
- Request the `pages_manage_posts` and `pages_read_engagement` permissions for the app review process.
- If you later implement full OAuth flows, configure valid OAuth redirect URIs that point to your API deployment (e.g., `https://<your-api>.onrender.com/auth/facebook/callback`).

### 3. Post-Deployment Checks

1. Send a request to `https://<your-api>.onrender.com/health` to confirm the API is responding.
2. Call the `/auth/dev-login` endpoint to obtain a developer JWT and ensure authentication works.
3. Use the API and frontend to create a user, import a CSV queue, and confirm records persist in the PostgreSQL database.
4. Connect a Facebook Page token, publish a test post, and verify that a permalink is returned and accessible.

With all checks passing, your Render deployment should be ready for production traffic.
