# SoroScan Frontend

Next.js frontend for SoroScan contract timeline and event explorer pages.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` when running outside Docker:

```env
# Django backend base URL used by app/api/graphql proxy route
BACKEND_BASE_URL=http://localhost:8000
# Optional direct override for GraphQL endpoint
# BACKEND_GRAPHQL_URL=http://localhost:8000/graphql/
```

In Docker Compose, `BACKEND_BASE_URL` is set to `http://web:8000`.

## Routes

- `/` - Landing page
- `/gallery` - Terminal component gallery
- `/contracts/[contractId]/timeline` - Contract timeline
- `/contracts/[contractId]/events/explorer` - Contract event explorer

## Data Access

Frontend pages call `/api/graphql` (Next route handler), which proxies to Django `/graphql/`.
This keeps browser requests same-origin and avoids CORS/CSRF issues.
